# Prompts

Where every prompt lives, and how to check that it still behaves.

## What lives where

| Prompt | Location | Why there |
| --- | --- | --- |
| Guidance system prompt | `guidance_system.txt` (this folder) | Read from disk at import time by `tiby_ai.guidance.service`, so safety wording can be revised without touching Python. |
| Check-in extraction | `src/tiby_ai/prompts.py` | Inline next to `checkin_extraction_user`, which interpolates the transcript and must stay in step with it. |
| Audio transcription | `src/tiby_ai/prompts.py` | One sentence, no interpolation. |

The split is deliberate rather than incidental: a prompt that is read while
editing alongside the fixtures below stays on disk; one that must stay byte-
locked to the code that renders it stays inline.

## Checking a prompt

Three sets, three different questions. Pick by what you are actually asking.

### "Does the extraction still pull the right facts?"

```bash
uv run python scripts/test_live_providers.py --only extraction
```

Real provider, scored field by field against `tests/fixtures/extraction/cases.jsonl`.
Costs API calls. Prints an accuracy percentage per field and exits non-zero on a
miss. This is the only check that answers "how accurate is it".

### "Does guidance still fail closed?"

```bash
uv run python scripts/test_live_providers.py --only guidance
```

Real provider, one hard case: a personal dosing request must come back
`answer: null`. Use it as a deploy gate.

For the wider prompt review, with retrieved evidence and citations per case:

```bash
uv run python scripts/test_guidance_prompts.py
```

Runs all seven cases in `tests/fixtures/guidance/guidance.jsonl` through real
retrieval and the real provider, one JSON line per case, for manual reading.
`expected_behavior` in that file is review criteria in prose, not a
machine-checkable answer — this output is read by a human, not scored.

### "Did I break anything?"

```bash
uv run pytest
```

No provider calls, no credentials. Covers parsing, contracts, safety, and the
OCR engine over the committed card images.

## Rules for fixtures here

Never add a real patient statement, name, or card image to any of these sets.
Every fixture in the tree is synthetic and must stay that way — see
`tests/fixtures/README.md` for the full set and what each one is for.