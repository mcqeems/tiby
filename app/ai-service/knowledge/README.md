# Approved guidance source PDFs

This folder means exactly one thing: the PDFs that feed the retrieval index for
`/ai/guidance`. Nothing else belongs here.

- `raw/` — the source PDFs. The only files the index is ever built from.
- `manifest.json` — the source of truth. Every entry names a file under `raw/`,
  carries the issuing organisation, title, year, source URL, and the SHA-256 of
  the bytes it was indexed from.

## The indexing rule

`scripts/ingest_knowledge.py` reads `manifest.json` and nothing else. It does
not glob this folder. A PDF dropped into `raw/` without a manifest entry is
therefore **silently never indexed**, and guidance will quietly answer from the
older corpus instead of failing. `tests/test_knowledge_manifest.py` fails on
exactly that drift, in both directions.

Conversely, a markdown note left in this folder is harmless to the index, which
is why engineering notes live in `../docs/` instead — see `../docs/README.md`.

`tiby.db` is the generated index. It is a gitignored build artifact, not a
source file; rebuild it with the script above.

## Current sources

- `kemenkes-juknis-tb-so-2025.pdf` — Kementerian Kesehatan RI, *Petunjuk Teknis Penatalaksanaan Tuberkulosis Sensitif Obat di Indonesia* (2025).
- `kemenkes-pnpk-tb-2020.pdf` — Kementerian Kesehatan RI, *Pedoman Nasional Pelayanan Kedokteran Tata Laksana Tuberkulosis* (2020).
- `who-tb-guidelines-module4-2025.pdf` — WHO, *Consolidated Guidelines on Tuberculosis: Module 4: Treatment and Care* (2025).
- `who-tb-module4-2025.pdf` — WHO, *Operational Handbook on Tuberculosis: Module 4: Treatment and Care* (2025).

Keep this list in sync with the manifest when adding documents. These
references concern tuberculosis specifically and do not constitute general
medication or clinical advice. Check for newer editions before each release.