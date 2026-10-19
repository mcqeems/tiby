"""Grounded answering for general educational questions (``POST /ai/guidance``).

Flow: deterministic action-request guard (``safety.py``) → provider call with
packed evidence → citation allowlisting. Every failure path returns
``answer=None`` instead of an ungrounded answer; the model may only cite
``src-N`` IDs that were actually retrieved.
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
    grounded = (
        bool(provider_result.get("grounded"))
        and bool(citations)
        and isinstance(answer_text, str)
        and bool(answer_text.strip())
    )

    raw_limitations = provider_result.get("limitations")
    limitations = (
        [item for item in raw_limitations if isinstance(item, str)]
        if isinstance(raw_limitations, list)
        else []
    )

    return GuidanceResponse(
        answer=answer_text if grounded else None,
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
    """Turns retrieved evidence into one citation-grounded GuidanceResponse."""

    def __init__(self, client: NaraRouterClient | None = None):
        self.client = client or NaraRouterClient()

    async def answer(
        self, question: str, transcript: str | None, evidence: list[dict]
    ) -> GuidanceResponse:
        """Answer one question, failing closed on guard hits or invalid citations."""
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
