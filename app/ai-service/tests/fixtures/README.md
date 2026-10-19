# Test fixtures

Every file here is synthetic. No real patient statement, name, card image, or
medical record belongs in this tree — if you have one, it does not go in git
at all. Each set below has its own README with the detail.

| Set | What it is for | Exercised by |
| --- | --- | --- |
| `extraction/` | Ten Indonesian check-in transcripts with the facts a correct extraction should produce. The only set with machine-checkable expectations. | `scripts/test_live_providers.py --only extraction` |
| `guidance/` | Seven synthetic questions probing grounding and fail-closed behaviour. `expected_behavior` is review criteria in prose, not a scorable answer. | `scripts/test_guidance_prompts.py` |
| `ocr/` | Card images, split into `layouts/` (field parser) and `photos/` (whole pipeline). | `uv run pytest tests/test_ocr.py` |
| `audio/` | Five synthetic speech samples. **No expected facts attached — see its README.** | `scripts/test_live_providers.py --only audio` |

## Which one answers which question

- *Is the model accurate?* → `extraction/`, scored per field, via the live
  runner. It prints a percentage.
- *Does guidance still refuse personal dosing questions?* → the live runner's
  `guidance` group. One hard case, exits non-zero on regression.
- *Does the answer need a human eye?* → `guidance/` via its own runner, one
  JSON line per case with the retrieved evidence and citations attached.
- *Did I break the parsing or the contract?* → `uv run pytest`, no credentials,
  no network, no provider calls.

## Adding a case

Only `extraction/` has expectations, so a new case there is the one that will
actually catch a regression. Write the transcript so the answer is unambiguous
but the phrasing is natural — including at least one case where the honest
answer is "unstated". A case whose expected value is debatable will produce a
failure that argues with you rather than a regression report, and you will
learn to ignore the runner.