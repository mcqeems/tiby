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

## Project layout

- `src/tiby_ai/main.py` — FastAPI routes and dependency wiring.
- `src/tiby_ai/extraction/` — check-in fact extraction.
- `src/tiby_ai/guidance/` — safety guard, retrieval, PDF ingestion, and grounded answers.
- `src/tiby_ai/providers/` — LLM and speech-to-text adapters.
- `prompts/` — active system prompts; synthetic regression cases and audio samples live under `tests/fixtures/`.
- `knowledge/raw/` — approved source PDFs; `knowledge/tiby.db` is a local generated index.
- `scripts/` — manual ingestion and live prompt QA commands.
- `tests/` — automated tests and non-patient fixtures.

## Tokens

Set in the shell that launches the app; read per request, never logged.

| Env var | Needed for | Notes |
| --- | --- | --- |
| `NARAROUTER_API_TOKEN` (or `NARAROUTER_API_KEY`) | check-in extraction + guidance | requires `NARAROUTER_BASE_URL` including `/v1`; model via `TIBY_LLM_MODEL`, default `agnes-2.5-flash` |
| `GROQ_API_KEY` | `/ai/extractions/check-in/audio` | default transcriber (`TIBY_TRANSCRIBER=groq`) |
| `FISH_AUDIO_API_TOKEN` (or `FISH_API_KEY`) | audio when `TIBY_TRANSCRIBER=fish` | optional alternative transcriber |

Missing token → 503, provider failure → 502, timeout → 504. For offline smoke tests, `TIBY_EXTRACTOR=rules` swaps extraction for the local keyword baseline (not clinically validated); guidance still needs the LLM token, audio still needs a speech-to-text token.

## Endpoints

- `POST /ai/extractions/check-in` — JSON transcript → structured facts (`null` = unstated or uncertain, never false).
- `POST /ai/extractions/check-in/audio` — multipart `audio` (max 20 MB) → transcription + facts.
- `POST /ai/guidance` — educational answers only from approved-source evidence; fails closed (`answer: null`) on personal dosing/start-stop questions or when no evidence matches. Not a diagnosis or treatment instruction.
- `GET /ai/health` — liveness.

## Test

```bash
uv run pytest    # mocked providers; use only synthetic data, never real patient data
```

`tests/test_api_contract.py` fails if the code and the `shared/api-contract` collection drift apart (routes, `/ai` prefix, JSON bodies, docs/examples present).

## Knowledge base (guidance)

`/ai/guidance` reads `knowledge/tiby.db` (gitignored build artifact) built from the PDFs listed in `knowledge/manifest.json`:

```bash
uv run python scripts/ingest_knowledge.py      # rebuild after changing the manifest
uv run python scripts/test_guidance_prompts.py # live prompt QA (real calls, manual review)
```

Fresh clone without the index → guidance returns `answer: null`. The seed is TB-specific; verify issuer/edition before relying on any document.
