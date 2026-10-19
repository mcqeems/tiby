# Engineering notes

Decisions, research, and context that are **not** part of the running service
and must never reach the retrieval index.

| File | What it is |
| --- | --- |
| `research/rapidocr-vs-paddleocr.md` | Source-based selection note for the onboarding-card OCR engine. Picks RapidOCR/ONNX Runtime with PP-OCRv6 `small` on the `id` language route, and is explicit that no published head-to-head benchmark exists for this task. |

Nothing here is indexed by `/ai/guidance`. Only the PDFs listed in
`knowledge/manifest.json` are — see `../knowledge/README.md`.

If a note is about *medical* content rather than about the code, it does not
belong here either. Guidance may only cite an approved source document, and
that document has to go through `knowledge/raw/` with provenance recorded.