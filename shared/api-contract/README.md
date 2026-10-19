# Tiby API Contract

Source of truth untuk batas komunikasi antara frontend, backend, dan AI service.

Kontraknya hidup sebagai collection **OpenCollection (format Bruno)** di folder ini — bukan di README. Pakai caranya: buka **Bruno → Open Collection → pilih folder `shared/api-contract`**, pilih environment (`local` untuk request AI, `TIby API ENV` untuk Backend), lalu run request-nya. Detail field ditulis sebagai komentar di body request, dan contoh response disimpan dari hasil run asli — jangan diketik manual.

## Prinsip

- AI service **mengekstrak fakta dari transkrip**, bukan menentukan diagnosis atau status risiko.
- `medication`, `symptoms`, `possible_red_flags`, dan `intent_to_stop` adalah hasil ekstraksi yang masih harus diproses oleh deterministic safety rule engine di backend.
- Nilai `null` berarti informasi tidak disebutkan atau tidak dapat diekstrak. Jangan menganggap `null` sebagai `false`.
- Jika AI gagal, timeout, atau output provider tidak valid, backend harus memperlakukannya sebagai hasil tidak pasti dan menjalankan jalur fail-safe.

Aturan ekstraksi:

- `confidence` berada pada rentang `0..1`, tetapi bukan probabilitas klinis.
- `symptoms[].name` adalah teks singkat yang dinormalisasi ringan, bukan diagnosis.
- `possible_red_flags` hanya sinyal yang terdeteksi dari daftar vocabulary; keputusan keselamatan tetap di backend.
- `intent_to_stop` hanya boleh `true` jika ada ucapan eksplisit seperti ingin berhenti/tidak mau melanjutkan.
- Ekstraksi ambigu harus menghasilkan `null` atau menambah `uncertainties`, bukan menebak.

## Endpoint

- `GET /ai/health` — liveness.
- `POST /ai/extractions/check-in` — ekstraksi fakta dari transkrip teks.
- `POST /ai/extractions/check-in/audio` — multipart audio; STT dulu (Groq Whisper default, `TIBY_TRANSCRIBER=fish` untuk Fish Audio), lalu ekstraksi yang sama.
- `POST /ai/guidance` — jawaban edukatif yang hanya boleh mengutip evidence resmi WHO/Kemenkes. Fail-closed (`answer: null`) untuk pertanyaan keputusan pribadi (dosis, mulai/berhenti/ubah obat) atau jika tidak ada evidence yang cocok. Bukan diagnosis atau instruksi pengobatan.

## Konvensi

- Semua error memakai envelope `ApiError` (`code`, `message`, `request_id` opsional). Kode: `INVALID_REQUEST` (422), `EXTRACTION_FAILED` (502), `PROVIDER_TIMEOUT` (504), `INTERNAL` (503, provider belum dikonfigurasi).
- Ekstraksi dan guidance memakai NaraRouter (`NARAROUTER_API_TOKEN` + `NARAROUTER_BASE_URL`, model via `TIBY_LLM_MODEL`).
- Guidance hanya boleh mengutip `citation_id` (`src-N`) yang dikirim ke model; citation di luar allowlist menggagalkan request (fail-closed).

## Files

- `opencollection.yml` — OpenCollection v1.0.0 collection root (Bruno format).
- `environments/local.yml` — environment AI service (`baseUrl = http://localhost:8000`).
- `environments/TIby API ENV.yml` — environment backend (`baseUrl = http://localhost:3001`).
- `AI/` — request AI service (body berkomentar + contoh response dari hasil run asli): `extractions/` (check-in teks & audio), `guidance/`, `health/`.
- `AI/examples/check-in-audio.wav` — audio sintetis untuk request audio.
- `AI/examples/check-in-request.json`, `check-in-response.json` — contoh JSON untuk review cepat.
- `Backend/` — request backend (`Health (api/)`); jalankan dengan environment `TIby API ENV`.
- `app/ai-service/src/tiby_ai/contracts.py` — model Pydantic yang memvalidasi payload Python.
- `app/ai-service/tests/test_api_contract.py` — test yang gagal kalau route kode dan folder `AI/` berbeda.
