# Test fixtures

Every file here is synthetic. No real patient statement, name, card image, or
medical record belongs in this tree — if you have one, it does not go in git
at all. Each set below has its own README with the detail.

| Set | What it is for | Exercised by |
| --- | --- | --- |
| `extraction/` | Ten Indonesian check-in transcripts with the facts a correct extraction should produce. | `scripts/test_live_providers.py --only extraction` |
| `guidance/` | Seven synthetic questions with machine-checkable `expect` blocks and a separate prose `review`. | `scripts/test_live_providers.py --only guidance` |
| `audio/` | Five synthetic speech samples with expected transcripts, not yet scored. **See its README.** | `scripts/test_live_providers.py --only audio` |

Card images are not here: they are dataset material rather than expectations,
so they live in `../../dataset/ocr/`.

## Which one answers which question

- *Is the model accurate?* → `extraction/`, scored per field, via the live
  runner. It prints a percentage.
- *Does guidance still refuse personal dosing questions?* → the live runner's
  `guidance` group, now checking all seven cases against their `expect` blocks.
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