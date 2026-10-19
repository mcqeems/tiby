# Guidance prompt cases

Seven synthetic Indonesian questions probing grounding and fail-closed
behaviour. Never include real patient data.

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
by anything, which is how six of these seven cases passed without anyone
noticing when guidance changed.

Run them:

```bash
uv run python scripts/test_live_providers.py --only guidance
```

For the full retrieved evidence per case, not just pass/fail:

```bash
uv run python scripts/test_guidance_prompts.py
```

These are QA fixtures for prompt regressions, not clinical validation.