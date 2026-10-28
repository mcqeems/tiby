# Tiby AI Service

FastAPI service for TB check-ins: extracts reported facts from transcripts (text or audio) and answers general questions with citation-grounded Kemenkes/WHO evidence. It does **not** diagnose, assign risk, or recommend treatment — deterministic safety rules live in the backend. Module docs live in docstrings; the HTTP contract is the OpenCollection (Bruno format) collection in `../../shared/api-contract` — open it with **Bruno → Open Collection → select the folder**.

## Install & run

From `app/ai-service`:

```bash
uv sync --group dev                        # .venv + deps + this package (editable); uv.lock is committed
cp .env.example .env                       # then fill in the secrets — loaded automatically
uv run uvicorn main:app --reload           # http://localhost:8000, docs at /docs
```

## Layout

```
src/
  main.py       # composes the app; mounts domain routers
  errors.py     # the shared ApiError envelope
  contracts.py  # HTTP contract, mirroring shared/ts-shared
  extraction/  guidance/  onboarding_ocr/  providers/
```

`dataset/knowledge/` holds the approved PDFs that feed `/ai/guidance` and nothing
else; the rest of `dataset/` holds the synthetic card images and transcripts the
tests read. Each `dataset/*` folder carries its own README.

### OCR weights

`/ocr/extract` runs PP-OCRv6 locally, and those weights are **hash-locked and never downloaded at runtime**.
RapidOCR will happily fetch ~30 MB from ModelScope the moment it cannot find a file# Pre-stage here at build time (Docker: COPY the weights in), or set in `.env`:

# TIBY_OCR_MODEL_DIR=/opt/tiby/ocr-models

Without the variable it falls back to the cache inside the installed `rapidocr` package, which is what local development uses. `models.lock.json` records the SHA-256 of each weight; changing a hash means OCR output may change, so re-run `uv run pytest tests/test_ocr.py` before committing one. Set it in `.env` (copy `.env.example` first) or pre-stage at build time for Docker — see `TIBY_OCR_MODEL_DIR` in `.env.example`.

## Tokens

Set in `.env`; also read per request, never logged. Anything already in the real environment (Docker `env_file:` / `environment:`, CI secrets) wins over `.env`, so the same image runs in Docker with the variables injected and no `.env` file.

| Env var                                          | Needed for                         | Notes                                                                                                 |
| ------------------------------------------------ | ---------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `NARAROUTER_API_TOKEN` (or `NARAROUTER_API_KEY`) | check-in extraction + guidance     | requires `NARAROUTER_BASE_URL` including `/v1`; model via `TIBY_LLM_MODEL`, default `agnes-2.5-flash` |
| `GROQ_API_KEY`                                   | `/ai/extractions/check-in/audio`   | default transcriber (`TIBY_TRANSCRIBER=groq`)                                                         |
| `FISH_AUDIO_API_TOKEN` (or `FISH_API_KEY`)       | audio when `TIBY_TRANSCRIBER=fish` | also requires `FISH_ENDPOINT`; optional alternative transcriber                                      |

Missing token → 503, provider failure → 502, timeout → 504. Real providers are the default on `TIBY_EXTRACTOR` and `TIBY_TRANSCRIBER`; `TIBY_EXTRACTOR=rules` is the offline keyword baseline for deterministic tests only, and any unrecognised value is rejected at startup rather than falling through to a paid provider.

## Endpoints

- `POST /ai/extractions/check-in` — JSON transcript → structured facts (`null` = unstated or uncertain, never false).
- `POST /ai/extractions/check-in/audio` — multipart `audio` (max 10 MB) → transcription + facts.
- `POST /ai/guidance` — educational answers from approved-source evidence only; fails closed (`answer: null`) on personal dosing/start-stop questions or when no evidence matches.
- `GET /ai/health` — liveness.

Backend aliases, kept private from the contract collection: `POST /text/extract`, `POST /audio/extract`, `POST /ocr/extract` (`cardImage`, max 10 MB). OCR returns an unconfirmed draft — read `fieldConfidence` and `uncertainties` before trusting any field. `tests/test_api_contract.py` fails if the routes and the collection drift apart.

## Test

```bash
source .venv/bin/activate  # venv
uv run pytest                                     # offline; no tokens, no network
uv run python tests/test_live_providers.py    # real providers (creds from .env); pass/fail + accuracy per field
uv run python tests/test_guidance_prompts.py # real providers (creds from .env); one JSON line per case, human review
```

Each answers a different question, and `dataset/README.md` picks the right one: `pytest` for _did I break the code?_ (it also runs the real OCR engine over the card images in `dataset/`), `test_live_providers.py` for _is the AI working and how accurate is it?_ (exits non-zero, so it can gate a deploy), `test_guidance_prompts.py` for _does this answer need a human eye?_

```bash
uv run python tests/test_live_providers.py --only extraction --repeat 3
uv run python tests/test_live_providers.py --list   # health ocr extraction audio guidance
TIBY_EXTRACTOR=rules uv run pytest -q     # the offline baseline, not a live check
```

Extraction is not deterministic, so `--repeat` separates a case that is sometimes right (`UNSTABLE`) from one that never is (`FAIL`). The live runner refuses to run under `TIBY_EXTRACTOR=rules`, where a green run would be indistinguishable from a green run against the model.

Run `ruff`, `mypy`, and `pytest` from `app/ai-service`, not the repo root: `pyproject.toml` sets no `[tool.ruff]`, so first-party detection follows the working directory and you get a wall of spurious `I001` errors otherwise.

## Knowledge base

`/ai/guidance` reads `dataset/knowledge/tiby.db`, built from the PDFs in `dataset/knowledge/manifest.json`:

```bash
uv run python scripts/ingest_knowledge.py
```

Fresh clone without the index → guidance returns `answer: null`. TB-specific; verify issuer and edition before relying on any document. See `dataset/knowledge/README.md`.
