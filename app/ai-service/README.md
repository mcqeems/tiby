# Tiby AI Service

FastAPI service for TB check-ins: extracts reported facts from transcripts (text or audio) and answers general questions with citation-grounded Kemenkes/WHO evidence. It does **not** diagnose, assign risk, or recommend treatment — deterministic safety rules live in the backend. Module docs live in docstrings; the HTTP contract is the OpenCollection (Bruno format) collection in `../../shared/api-contract` — open it with **Bruno → Open Collection → select the folder**.

## Install & run

From `app/ai-service`:

```bash
uv sync --group dev                        # .venv + deps + this package (editable); uv.lock is committed
export NARAROUTER_API_TOKEN="..."          # or NARAROUTER_API_KEY
export NARAROUTER_BASE_URL="https://your-router-base/v1"
export GROQ_API_KEY="..."                  # audio endpoint (default transcriber)
uv run uvicorn tiby_ai.main:app --reload   # http://localhost:8000, docs at /docs
```

## Layout

Layered like the backend's NestJS modules, so both services read the same way: `controllers/` is HTTP wiring only, `services/` holds the use cases.

```
src/tiby_ai/
  main.py       # composes the app; mounts domain routers
  errors.py     # the shared ApiError envelope
  contracts.py  # HTTP contract, mirroring shared/ts-shared
  extraction/  guidance/  onboarding_ocr/  providers/
```

`knowledge/` holds the approved PDFs that feed `/ai/guidance` and nothing else; `dataset/` holds the synthetic card images the OCR tests read; `docs/` holds engineering notes that are never indexed. `prompts/` and `tests/fixtures/` carry their own READMEs.

### OCR weights

`/ocr/extract` runs PP-OCRv6 locally, and those weights are **hash-locked and never downloaded at runtime**. RapidOCR will happily fetch ~30 MB from ModelScope the moment it cannot find a file; the service checks first and returns 503 instead.

```bash
export TIBY_OCR_MODEL_DIR=/opt/tiby/ocr-models   # pre-stage here at build time
```

Without the variable it falls back to the cache inside the installed `rapidocr` package, which is what local development uses. `models.lock.json` records the SHA-256 of each weight; changing a hash means OCR output may change, so re-run `uv run pytest tests/test_ocr.py` before committing one.

## Tokens

Set in the shell that launches the app; read per request, never logged.

| Env var | Needed for | Notes |
| --- | --- | --- |
| `NARAROUTER_API_TOKEN` (or `NARAROUTER_API_KEY`) | check-in extraction + guidance | requires `NARAROUTER_BASE_URL` including `/v1`; model via `TIBY_LLM_MODEL`, default `agnes-2.5-flash` |
| `GROQ_API_KEY` | `/ai/extractions/check-in/audio` | default transcriber (`TIBY_TRANSCRIBER=groq`) |
| `FISH_AUDIO_API_TOKEN` (or `FISH_API_KEY`) | audio when `TIBY_TRANSCRIBER=fish` | optional alternative transcriber |

Missing token → 503, provider failure → 502, timeout → 504. Real providers are the default on `TIBY_EXTRACTOR` and `TIBY_TRANSCRIBER`; `TIBY_EXTRACTOR=rules` is the offline keyword baseline for deterministic tests only, and any unrecognised value is rejected at startup rather than falling through to a paid provider.

## Endpoints

- `POST /ai/extractions/check-in` — JSON transcript → structured facts (`null` = unstated or uncertain, never false).
- `POST /ai/extractions/check-in/audio` — multipart `audio` (max 10 MB) → transcription + facts.
- `POST /ai/guidance` — educational answers from approved-source evidence only; fails closed (`answer: null`) on personal dosing/start-stop questions or when no evidence matches.
- `GET /ai/health` — liveness.

Backend aliases, kept private from the contract collection: `POST /text/extract`, `POST /audio/extract`, `POST /ocr/extract` (`cardImage`, max 10 MB). OCR returns an unconfirmed draft — read `fieldConfidence` and `uncertainties` before trusting any field. `tests/test_api_contract.py` fails if the routes and the collection drift apart.

## Test

```bash
uv run pytest                                 # offline; no tokens, no network
uv run python scripts/test_live_providers.py  # real providers; pass/fail + accuracy per field
uv run python scripts/test_guidance_prompts.py # real providers; one JSON line per case, human review
```

Each answers a different question, and `prompts/README.md` picks the right one: `pytest` for *did I break the code?* (it also runs the real OCR engine over the card images in `dataset/`), `test_live_providers.py` for *is the AI working and how accurate is it?* (exits non-zero, so it can gate a deploy), `test_guidance_prompts.py` for *does this answer need a human eye?*

```bash
uv run python scripts/test_live_providers.py --only extraction --repeat 3
uv run python scripts/test_live_providers.py --list   # health ocr extraction audio guidance
TIBY_EXTRACTOR=rules uv run pytest -q     # the offline baseline, not a live check
```

Extraction is not deterministic, so `--repeat` separates a case that is sometimes right (`UNSTABLE`) from one that never is (`FAIL`). The live runner refuses to run under `TIBY_EXTRACTOR=rules`, where a green run would be indistinguishable from a green run against the model.

One thing is **not** measured: audio transcription accuracy — the samples in `tests/fixtures/audio/` carry no expected transcript, so the live runner only proves the provider is reachable and the contract holds. OCR is likewise measured only on synthetic scans. See `tests/fixtures/README.md`.

Run `ruff`, `mypy`, and `pytest` from `app/ai-service`, not the repo root: `pyproject.toml` sets no `[tool.ruff]`, so first-party detection follows the working directory and you get a wall of spurious `I001` errors otherwise.

## Knowledge base

`/ai/guidance` reads `knowledge/tiby.db`, built from the PDFs in `knowledge/manifest.json`:

```bash
uv run python scripts/ingest_knowledge.py
```

Fresh clone without the index → guidance returns `answer: null`. TB-specific; verify issuer and edition before relying on any document. See `knowledge/README.md`.