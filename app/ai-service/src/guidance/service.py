"""Answering for general educational and Tiby app questions (``POST /ai/guidance``).

Flow: deterministic prompt-injection guard (``safety.py``) → clinical caution
classification → provider call with retrieved evidence and Tiby product
knowledge → citation allowlisting + guaranteed Nakes referral on caution queries.

Two properties are separate on purpose:

- **Safety** — prompt injections fail closed immediately; personal dosing or
  medication-change prompts reach the model in ``caution_mode`` so Pandu gives
  safe context (e.g., onboarding regimens like FDC-4/FDC-3) and strongly
  refers the user to their Nakes/Faskes.
- **Grounding** — whether a supplied Kemenkes/WHO source backs the answer. A
  basic health or Tiby app question with no matching source is still answerable;
  it is returned with ``grounded=false`` and no citations rather than being
  refused.

The model may only cite ``src-N`` IDs that were actually retrieved.
"""

import json
from dataclasses import asdict
from pathlib import Path

from contracts import GuidanceCitation, GuidanceEvidence, GuidanceResponse
from guidance.retrieval import Evidence
from guidance.safety import detect_clinical_caution, detect_prompt_injection
from providers.base import ProviderError
from providers.nararouter import NaraRouterClient

GUIDANCE_SYSTEM = Path(__file__).with_name("guidance_system.txt")
GUIDANCE_SYSTEM_TEXT = GUIDANCE_SYSTEM.read_text(encoding="utf-8")
TIBY_KNOWLEDGE = Path(__file__).with_name("tiby_knowledge.txt")
TIBY_KNOWLEDGE_TEXT = TIBY_KNOWLEDGE.read_text(encoding="utf-8")
FULL_GUIDANCE_SYSTEM_TEXT = (
    f"{GUIDANCE_SYSTEM_TEXT.strip()}\n\n{TIBY_KNOWLEDGE_TEXT.strip()}"
)

INJECTION_LIMITATION = (
    "Permintaan ini tidak dapat diproses karena mencoba mengubah aturan Pandu. "
    "Silakan ajukan pertanyaan seputar pengobatan atau penggunaan aplikasi Tiby, "
    "atau hubungi tenaga kesehatan yang menangani Anda."
)
CLINICAL_CAUTION_LIMITATION = (
    "Untuk memastikan dosis, kelanjutan, atau penyesuaian obat sesuai kondisi pribadi "
    "Anda, sangat disarankan segera menghubungi tenaga kesehatan atau faskes yang "
    "menangani Anda."
)


def pack_evidence(evidence: list[Evidence]) -> list[dict]:
    """Convert retrieved evidence into the provider payload with ``src-N`` citation IDs.

    The IDs are request-scoped: the model only ever sees these handles, never
    the internal chunk IDs.
    """
    return [
        {
            "citation": {**asdict(item.citation), "citation_id": f"src-{index}"},
            "text": item.text,
        }
        for index, item in enumerate(evidence, start=1)
    ]


def render_answer(provider_result: dict, evidence: list[dict]) -> GuidanceResponse:
    """Validate a provider JSON answer against the citation allowlist.

    ``grounded`` means "a supplied source backs this answer", not "this answer is
    allowed". An uncited general-health answer is legitimate and keeps its text;
    it is simply reported as ``grounded=false`` with no citations, so the client
    can tell the two apart instead of being told the question was out of scope.

    Any citation the provider returns must still be in the allowlist; that stays
    a hard error, because citing a source it was not given is fabrication.

    Raises ValueError when the provider cites a source it was not given.
    """
    allowed = {item["citation"]["citation_id"] for item in evidence}
    cited = provider_result.get("citation_ids", [])
    if not isinstance(cited, list) or any(identifier not in allowed for identifier in cited):
        raise ValueError("Provider cited an unknown source")
    by_id = {item["citation"]["citation_id"]: item for item in evidence}
    selected = [by_id[identifier] for identifier in dict.fromkeys(cited)]
    citations = [GuidanceCitation.model_validate(item["citation"]) for item in selected]

    answer_text = provider_result.get("answer")
    has_answer = isinstance(answer_text, str) and bool(answer_text.strip())
    # Grounded requires a real answer *and* a citation that survived the allowlist.
    grounded = bool(provider_result.get("grounded")) and bool(citations) and has_answer

    raw_limitations = provider_result.get("limitations")
    limitations = (
        [item for item in raw_limitations if isinstance(item, str)]
        if isinstance(raw_limitations, list)
        else []
    )

    return GuidanceResponse(
        answer=answer_text if has_answer else None,
        grounded=grounded,
        evidence=[
            GuidanceEvidence(citation_id=item["citation"]["citation_id"], text=item["text"])
            for item in selected
        ]
        if grounded
        else [],
        citations=citations if grounded else [],
        limitations=limitations,
    )


class GroundedAnswerer:
    """Turns retrieved evidence (and Pandu's own product knowledge) into one answer."""

    def __init__(self, client: NaraRouterClient | None = None):
        self.client = client or NaraRouterClient()

    async def answer(
        self, question: str, transcript: str | None, evidence: list[dict]
    ) -> GuidanceResponse:
        """Answer one question, blocking only prompt injections deterministically.

        ``evidence`` may be empty: finding no source is normal for basic health
        or Tiby app questions, which are returned with ``grounded=false``. When
        ``detect_clinical_caution`` fires, ``caution_mode`` guides the model and
        a strong Nakes/Faskes referral is guaranteed in ``limitations``.
        """
        if detect_prompt_injection(question, transcript):
            return GuidanceResponse(
                answer=None, grounded=False, limitations=[INJECTION_LIMITATION]
            )
        caution = detect_clinical_caution(question, transcript)
        payload: dict[str, object] = {
            "question": question,
            "transcript": transcript,
            "evidence": evidence,
        }
        if caution is not None:
            payload["caution_mode"] = caution
        user = json.dumps(payload, ensure_ascii=False)
        provider_result = await self.client.chat_json(FULL_GUIDANCE_SYSTEM_TEXT, user)
        try:
            response = render_answer(provider_result, evidence)
        except ValueError as exc:
            raise ProviderError("Guidance generation failed or returned invalid citations.") from exc

        if caution is not None and response.answer is not None:
            has_nakes_note = any(
                "tenaga kesehatan" in item.lower()
                or "nakes" in item.lower()
                or "faskes" in item.lower()
                for item in response.limitations
            )
            if not has_nakes_note:
                response.limitations.append(CLINICAL_CAUTION_LIMITATION)
        return response
