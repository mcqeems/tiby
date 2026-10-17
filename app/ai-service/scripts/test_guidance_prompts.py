"""Run the guidance regression cases against the live stack for manual review.

Every case in ``tests/fixtures/guidance/guidance.jsonl`` goes through real retrieval
and the real provider, then prints one JSON line per case (guard hit, retrieved
count, answer, citations). Requires provider credentials and costs API calls;
review the output by hand — these cases are QA fixtures, not clinical
validation (see ``prompts/test-cases/README.md``).

Usage (from ``app/ai-service``)::

    uv run python scripts/test_guidance_prompts.py
"""

import asyncio
import json
from pathlib import Path

from tiby_ai.guidance.service import GroundedAnswerer, pack_evidence
from tiby_ai.guidance.retrieval import SQLiteRetriever
from tiby_ai.guidance.safety import detect_action_request


def main() -> None:
    """Load the cases, run each through retrieval + answerer, print results."""
    cases_path = Path("tests/fixtures/guidance/guidance.jsonl")
    retriever = SQLiteRetriever()
    answerer = GroundedAnswerer()
    cases = [json.loads(line) for line in cases_path.read_text(encoding="utf-8").splitlines() if line.strip()]

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
            "expected_behavior": case["expected_behavior"],
        }

    async def run_all() -> None:
        for case in cases:
            try:
                result = await run_case(case)
                print(json.dumps(result, ensure_ascii=False))
            except Exception as exc:
                print(json.dumps({"id": case["id"], "error": type(exc).__name__}, ensure_ascii=False))

    asyncio.run(run_all())


if __name__ == "__main__":
    main()
