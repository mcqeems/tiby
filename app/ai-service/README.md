# Tiby AI Service

FastAPI service for TB check-ins: extracts reported facts from transcripts (text or audio) and answers general questions with citation-grounded Kemenkes/WHO evidence. It does **not** diagnose, assign risk, or recommend treatment — deterministic safety rules live in the backend. Module docs live in docstrings; the HTTP contract is `../../shared/api-contract/openapi.yaml`.

## Install & run

From `app/ai-service`:

```bash
uv sync --group dev                        # .venv + deps + this package (editable); uv.lock is committed
export NARAROUTER_API_TOKEN="..."          # or NARAROUTER_API_KEY
export NARAROUTER_BASE_URL="https://your-router-base/v1"
export GROQ_API_KEY="..."                  # audio endpoint (default transcriber)
uv run uvicorn tiby_ai.main:app --reload   # http://localhost:8000, docs at /docs
```

## Tokens

Set in the shell that launches the app; read per request, never logged.

| Env var | Needed for | Notes |
| --- | --- | --- |
| `NARAROUTER_API_TOKEN` (or `NARAROUTER_API_KEY`) | check-in extraction + guidance | requires `NARAROUTER_BASE_URL` including `/v1`; model via `TIBY_LLM_MODEL`, default `agnes-2.5-flash` |
| `GROQ_API_KEY` | `/v1/extractions/check-in/audio` | default transcriber (`TIBY_TRANSCRIBER=groq`) |
| `FISH_AUDIO_API_TOKEN` (or `FISH_API_KEY`) | audio when `TIBY_TRANSCRIBER=fish` | optional alternative transcriber |

Missing token → 503, provider failure → 502, timeout → 504. For offline smoke tests, `TIBY_EXTRACTOR=rules` swaps extraction for the local keyword baseline (not clinically validated); guidance still needs the LLM token, audio still needs a speech-to-text token.

## Endpoints

- `POST /v1/extractions/check-in` — JSON transcript → structured facts (`null` = unstated or uncertain, never false).
- `POST /v1/extractions/check-in/audio` — multipart `audio` (max 20 MB) → transcription + facts.
- `POST /v1/guidance` — educational answers only from approved-source evidence; fails closed (`answer: null`) on personal dosing/start-stop questions or when no evidence matches. Not a diagnosis or treatment instruction.
- `GET /health` — liveness.

```bash
curl -X POST http://localhost:8000/v1/extractions/check-in/audio -F 'audio=@speech.wav;type=audio/wav'
```

## Test

```bash
uv run pytest    # mocked providers; use only synthetic data, never real patient data
```

`tests/test_openapi_contract.py` fails if the code and `openapi.yaml` drift apart.

## Knowledge base (guidance)

`/v1/guidance` reads `knowledge/tiby.db` (gitignored build artifact) built from the PDFs listed in `knowledge/manifest.json`:

```bash
uv run python scripts/ingest_knowledge.py      # rebuild after changing the manifest
uv run python scripts/test_guidance_prompts.py # live prompt QA (real calls, manual review)
```

Fresh clone without the index → guidance returns `answer: null`. The seed is TB-specific; verify issuer/edition before relying on any document.
