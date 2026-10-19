# Extraction cases

Ten synthetic Indonesian transcripts, one per line in `cases.jsonl`, each
paired with the facts a correct extraction should produce. Never add a real
patient statement here.

Run them:

```bash
PYTHONPATH=src uv run python tests/test_live_providers.py --only extraction --repeat 3
```

What the expectations mean:

- **`medicationTaken`** — `SUDAH_MINUM` / `BELUM_MINUM` / `TIDAK_PASTI`.
  `TIDAK_PASTI` is the case that matters most: a hesitant transcript must not
  be resolved into a yes or a no.
- **`pillsTakenCount`** — the count the patient actually said. `null` when no
  count was spoken ("sudah minum obatnya"), never a number deduced from the
  regimen. One case accepts several answers via `{"any_of": [...]}`: for "belum
  minum obat sama sekali", `0` and `null` are both defensible and the model
  returns both, so the fixture takes either rather than failing on a coin flip.
  Use the `any_of` wrapper, never a bare list — `symptoms` is itself a list, and
  a bare list reads as a set of alternatives.
- **`symptoms`** — backend vocabulary codes from `extraction.mapper.KNOWN_SYMPTOMS`.
  Negated mentions ("tidak sesak") must not appear.
- **`intentToStopOrRefuse`** — true only for an explicit wish to stop.

A partial dose ("sudah minum 2 butir, sisanya belum") expects `SUDAH_MINUM`
with the count, not `TIDAK_PASTI`: the backend decides dose fulfilment against
the quota, so resolving it to "unsure" here would throw away information the
patient did give.

## Unstable answers are not the same as wrong answers

The extraction model is not deterministic. The same transcript can come back
answered one way now and another way on the next run — measured, not assumed;
it is why `--repeat` exists. A case that is right some of the time reports as
`UNSTABLE`, which is a prompt problem worth looking at, and is kept separate
from `FAIL`, which means the model never got it right. Never treat a single
run's accuracy as a measurement.

These are QA fixtures for prompt regressions, not clinical validation.