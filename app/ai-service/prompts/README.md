# RAG prompt regression cases

Input files use JSONL so each scenario is independently runnable and reviewable. `expected_behavior` describes safety/grounding expectations, not an exact model answer. Never include real patient data.

Run all cases from `app/ai-service`:

```bash
uv run python scripts/test_guidance_prompts.py
```

Results are printed per case. Review answer text, citation IDs, and the retrieved evidence manually; these fixtures are not clinical validation.
