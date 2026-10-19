"""Synthetic onboarding-card images for the OCR regression tests.

Every card is invented — the names, the medical record number, and the address
are filler. Never replace one with a photograph of a real card, and never drop
a real patient record in here; see `../README.md` for the same
rule on the prompt side.

The fixtures are split by the layer they are meant to catch failing, so a card
that stops parsing tells you where to look:

## `layouts/` — the field parser

Clean scans, one per card layout that broke the parser in a different way. A
failure here is a `card_parser` regression.

| File | What it reproduces |
| --- | --- |
| `card-printed.png` | A clean scan; the baseline every other card is compared to. |
| `card-two-column.png` | A form whose columns the engine folds into one detected row, which used to swallow the second column's value. |
| `card-unlabelled.png` | A printed form filled in without a colon after the label. |

## `photos/` — the whole pipeline

| File | What it reproduces |
| --- | --- |
| `card-photographed.png` | A phone capture: skewed, shadowed, underexposed, JPEG'd, and downscaled. A failure here means the *engine* stopped reading, not that a parsing rule regressed. |

Regenerate with `uv run python dataset/ocr/make_cards.py`, which is
deterministic. Re-run the OCR tests afterwards: a card that stops reading is a
regression until proven otherwise, and the committed PNGs are what
`uv run pytest` compares against.
"""