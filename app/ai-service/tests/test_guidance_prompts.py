"""Run the guidance regression cases against the live stack for manual review.

Every case in ``dataset/guidance/guidance.jsonl`` goes through real retrieval
and the real provider, then prints one JSON line per case (guard hit, retrieved
count, answer, citations). Requires provider credentials and costs API calls;
review the output by hand — these cases are QA fixtures, not clinical
validation (see ``dataset/guidance/README.md``).

For a scored, pass/fail check that can gate a deploy, use
``tests/test_live_providers.py`` instead.

Usage::

    PYTHONPATH=src uv run python tests/test_guidance_prompts.py
"""

import asyncio
import json
from pathlib import Path

from guidance.retrieval import SQLiteRetriever
from guidance.safety import detect_action_request
from guidance.service import GroundedAnswerer, pack_evidence
from providers.base import ProviderError

CASES = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "guidance" / "guidance.jsonl"


def main() -> None:
    """Load the cases, run each through retrieval + answerer, print results."""
    retriever = SQLiteRetriever()
    answerer = GroundedAnswerer()
    cases = [json.loads(line) for line in CASES.read_text(encoding="utf-8").splitlines() if line.strip()]

    async def run_case(case: dict) -> dict:
        evidence = retriever.search(case["question"], limit=4)
        response = await answerer.answer(case["question"], None, pack_evidence(evidence))
        return {
            "id": case["id"],
            "question": case["question"],
            "guard_triggered": detect_action_request(case["question"]),
            "retrieved_count": len(evidence),
            "answer": response.answer,
            "grounded": response.grounded,
            "citations": [citation.model_dump() for citation in response.citations],
            "limitations": response.limitations,
            "expect": case["expect"],
            "review": case["review"],
        }

    async def run_all() -> None:
        for case in cases:
            try:
                result = await run_case(case)
                print(json.dumps(result, ensure_ascii=False))
            except (ProviderError, KeyError, ValueError) as exc:
                print(json.dumps({"id": case["id"], "error": type(exc).__name__}, ensure_ascii=False))

    asyncio.run(run_all())


if __name__ == "__main__":
    main()
