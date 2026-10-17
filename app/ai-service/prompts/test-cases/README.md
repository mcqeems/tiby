# RAG regression prompt set

This directory contains exactly seven synthetic user prompt cases. Expected behavior describes review criteria, not a medically validated expected answer. Never include real patient data. The active guidance system prompt lives at `../guidance_system.txt`.

Run from `app/ai-service`:

```bash
uv run python scripts/test_guidance_prompts.py
```

The runner makes live Agnes calls for prompts that pass the local safety guard, so it may incur API cost. Review each answer, retrieved evidence, and citation manually. This suite is QA, not clinical validation.
