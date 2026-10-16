# Tiby API Contract

Source of truth untuk batas komunikasi antara frontend, backend, dan AI service.

## Prinsip

- AI service **mengekstrak fakta dari transkrip**, bukan menentukan diagnosis atau status risiko.
- `medication`, `symptoms`, `possible_red_flags`, dan `intent_to_stop` adalah hasil ekstraksi yang masih harus diproses oleh deterministic safety rule engine di backend.
- Nilai `null` berarti informasi tidak disebutkan atau tidak dapat diekstrak. Jangan menganggap `null` sebagai `false`.
- Jika AI gagal, timeout, atau output provider tidak valid, backend harus memperlakukannya sebagai hasil tidak pasti dan menjalankan jalur fail-safe.

## Endpoint v1

`POST /v1/extractions/check-in`

Menerima transkrip check-in harian dan mengembalikan fakta terstruktur.

### Request minimal

```json
{
  "transcript": "Sudah minum obat empat biji. Mual dari siang dan tidak nafsu makan.",
  "language": "id-ID"
}
```

`transcript` wajib berupa teks hasil STT. Audio tidak dikirim ke endpoint ini; STT adalah tanggung jawab caller/provider terpisah.

### Response sukses

```json
{
  "schema_version": "1.0",
  "extraction": {
    "medication": {
      "taken": true,
      "dose_count": 4
    },
    "symptoms": [
      {
        "name": "mual",
        "severity": "unknown",
        "evidence": "Mual dari siang"
      },
      {
        "name": "tidak nafsu makan",
        "severity": "unknown",
        "evidence": "tidak nafsu makan"
      }
    ],
    "possible_red_flags": [],
    "intent_to_stop": false
  },
  "confidence": 0.94,
  "uncertainties": []
}
```

### Aturan penting

- `confidence` berada pada rentang `0..1`, tetapi bukan probabilitas klinis.
- `symptoms[].name` adalah teks singkat yang dinormalisasi ringan, bukan diagnosis.
- `possible_red_flags` hanya sinyal yang terdeteksi dari daftar vocabulary; keputusan keselamatan tetap di backend.
- `intent_to_stop` hanya boleh `true` jika ada ucapan eksplisit seperti ingin berhenti/tidak mau melanjutkan.
- Ekstraksi ambigu harus menghasilkan `null` atau menambah `uncertainties`, bukan menebak.

### Error envelope

```json
{
  "code": "INVALID_REQUEST",
  "message": "transcript must not be empty",
  "request_id": "req_123"
}
```

Kode minimum: `INVALID_REQUEST`, `EXTRACTION_FAILED`, `PROVIDER_TIMEOUT`, `INTERNAL`.

## Files

- `openapi.yaml` — kontrak HTTP yang bisa diimpor ke Bruno/Postman.
- `examples/check-in-request.json` — request contoh.
- `examples/check-in-response.json` — response contoh.
- `app/ai-service/src/tiby_ai/contracts.py` — model Pydantic yang memvalidasi payload Python.
