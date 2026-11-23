# Guidance prompt cases

Thirteen synthetic Indonesian questions probing grounding and fail-closed
behaviour. Never include real patient data.

Cases fall into three families, and it matters which is which:

- **Personal decision** (`guard_triggered: true`) — dosing, start/stop, switch.
  Must fail closed with `answer: null`.
- **General education** (`guard_triggered: false`) — "what is TB?", "why daily?",
  "with food?". Must be *answered*. `grounded` depends on whether a source
  exists; an uncited answer is correct here, not a failure.
- **Product knowledge** — about Pandu and about what Tiby offers. Never citable
  from the official corpus, so always `grounded: false` with an answer.

Each line carries two different things, and the split is the point:

- **`expect`** — what the live runner checks. `guard_triggered` is whether the
  local safety guard fires, `grounded` and `answer_is_null` mirror the response
  contract, and `min_citations` catches the failure that matters most: a
  `grounded: true` answer with no citation means the model asserted something
  the retrieved evidence does not support.
- **`review`** — prose for a human reading the output. Not asserted by anything.
  Do not put a machine-checkable claim here; it will silently never fail.

The previous revision put a `should_call_llm` flag next to an
`expected_behavior` paragraph that read like an assertion but was never checked
by anything, which is how cases passed without anyone noticing when guidance
changed.

An earlier revision also treated `grounded: false` as "must refuse", which is
how basic questions got rejected as out of scope. `answer_is_null` and
`grounded` are separate expectations now: a basic question needs
`answer_is_null: false` and may legitimately have `grounded: false`.

Run them:

```bash
PYTHONPATH=src uv run python tests/test_live_providers.py --only guidance
```

For the full retrieved evidence per case, not just pass/fail:

```bash
PYTHONPATH=src uv run python tests/test_guidance_prompts.py
```

These are QA fixtures for prompt regressions, not clinical validation.