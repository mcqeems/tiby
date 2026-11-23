"""Answering for general educational questions (``POST /ai/guidance``).

Flow: deterministic personal-decision guard (``safety.py``) → provider call with
whatever evidence retrieval found → citation allowlisting.

Two properties are separate on purpose:

- **Safety** — a personal decision request (dose, start/stop/switch) is refused
  deterministically and never reaches the model.
- **Grounding** — whether a supplied source backs the answer. A basic health
  question with no matching source is still answerable; it is returned with
  ``grounded=false`` and no citations rather than being refused.

The model may only cite ``src-N`` IDs that were actually retrieved.
"""

import json
from dataclasses import asdict
from pathlib import Path

from contracts import GuidanceCitation, GuidanceEvidence, GuidanceResponse
from guidance.retrieval import Evidence
from guidance.safety import detect_action_request
from providers.base import ProviderError
from providers.nararouter import NaraRouterClient

GUIDANCE_SYSTEM = Path(__file__).with_name("guidance_system.txt")
GUIDANCE_SYSTEM_TEXT = GUIDANCE_SYSTEM.read_text(encoding="utf-8")

ACTION_LIMITATION = (
    "Permintaan ini menyangkut keputusan atau tindakan pengobatan pribadi; "
    "silakan hubungi tenaga kesehatan yang menangani Anda."
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
        """Answer one question, failing closed only on personal decisions.

        ``evidence`` may be empty: findings no source is a normal outcome for a
        basic question, and the model answers those from general knowledge with
        ``grounded=false``. A personal decision request still never reaches the
        model, and the empty-evidence limitation is only added when the model
        declined, so an uncited answer is not labelled as out of scope.
        """
        if detect_action_request(question, transcript):
            return GuidanceResponse(answer=None, grounded=False, limitations=[ACTION_LIMITATION])
        user = json.dumps(
            {"question": question, "transcript": transcript, "evidence": evidence},
            ensure_ascii=False,
        )
        provider_result = await self.client.chat_json(GUIDANCE_SYSTEM_TEXT, user)
        try:
            return render_answer(provider_result, evidence)
        except ValueError as exc:
            raise ProviderError("Guidance generation failed or returned invalid citations.") from exc
