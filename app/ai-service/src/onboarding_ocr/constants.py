"""Constants and regex patterns for onboarding card parsing.

Separated from the parsing logic so that patterns can be tweaked without
touching the state machine in ``card_parser.py``.
"""

import re
from pathlib import Path

MIN_LINE_SCORE = 0.5
"""Below this a row is treated as unread rather than parsed."""

AMBIGUOUS_DATE_CONFIDENCE = 0.5
"""A date that could be day/month either way is never a confident date."""

DRAFT_FIELDS = (
    "patientName",
    "regimenCode",
    "dailyPillQuota",
    "startDate",
    "targetEndDate",
)
"""The draft fields the contract exposes, in the order a card lists them."""

SEPARATOR = r"\s*[:=-]?\s*"
"""Cards separate label from value with a colon, an equals sign, or nothing."""

LABEL_START = r"(?<![A-Za-z])"
"""Guard placed in front of every label."""

_LABELS: tuple[tuple[str | None, str], ...] = (
    (
        "patientName",
        rf"{LABEL_START}nama\s*(?:pasien|terduga|penderita|klien)\b{SEPARATOR}",
    ),
    ("regimenCode", rf"{LABEL_START}(?:regimen|paduan\s*obat)\b{SEPARATOR}"),
    (
        "dailyPillQuota",
        rf"{LABEL_START}(?:kuota(?:\s*(?:pil|obat))?|dosis(?:\s*harian)?|jumlah\s*obat|aturan\s*pakai)\b{SEPARATOR}",
    ),
    # `Mulai Terapi` and `Mulai Pengobatan` appear on Kemenkes forms where the
    # onboarding cards say `Tanggal Mulai`.
    (
        "startDate",
        rf"{LABEL_START}(?:tanggal\s*|tgl\.?\s*)?mulai(?:\s*(?:terapi|berobat|pengobatan|minum))?\b{SEPARATOR}",
    ),
    (
        "targetEndDate",
        rf"{LABEL_START}(?:tanggal\s*|tgl\.?\s*)?(?:target\s+|akhir\s+)?(?:selesai|akhir)\b{SEPARATOR}",
    ),
    ("patientName", rf"{LABEL_START}nama\b{SEPARATOR}"),
    # A bare `Tanggal:` is the prescription date on a Puskesmas treatment card,
    # where the onboarding `Tanggal Mulai` wording does not appear at all. It is
    # still a cut point for whatever row preceded it, so the value is read and
    # the previous field is not overrun.
    #
    # The negative lookahead is load-bearing: `Tanggal Lahir` is a birth date,
    # and reading it as the treatment start would date a regimen to the year the
    # patient was born. `Tanggal Kunjungan` is a visit number's date, not a
    # regimen start. Only a date that is not qualified by another noun qualifies.
    (
        "startDate",
        (
            rf"{LABEL_START}(?:tanggal|tgl\.?)(?!\s*(?:lahir|kunjungan|masuk|keluar|"
            rf"pulang|periksa|pemeriksaan|daftar|registrasi|rujukan|cetak|ambil))\b{SEPARATOR}"
        ),
    ),
    # Fields that are never a draft value, only a cut point: facility, clinician,
    # and identity columns sit next to the patient's name on most real forms, so
    # they must end the previous value instead of being read as one.
    (
        None,
        (
            rf"{LABEL_START}(?:no\.?\s*rm|no\.?\s*rekam\s*medis|alamat"
            rf"|no\.?\s*(?:hp|telp|tlp)|telepon|fasyankes|faskes|puskesmas|klinik|rumah\s*sakit"
            rf"|dokter|dr|petugas|pengirim|jenis\s*(?:kelamin|terduga)"
            rf"|nik|bpjs|provinsi|umur|catatan|keterangan)\b{SEPARATOR}"
        ),
    ),
)
"""Longest and most specific label first: a later match inside an already
claimed span is skipped, so ``Nama Pasien`` never also reads as ``Nama``."""

COMPILED_LABELS = tuple(
    (field, re.compile(pattern, re.IGNORECASE)) for field, pattern in _LABELS
)

QUOTA_PATTERN = re.compile(r"(\d{1,3})")
DAILY_USAGE_PATTERN = re.compile(
    r"(\d{1,2})\s*[x×]\s*(\d{1,2})\s*(?:x\s*)?(?:sehari|per\s*hari|/hari|daily)",
    re.IGNORECASE,
)
"""`1 x 1 sehari` / `2 x 2 per hari`: pills per dose, then doses per day."""

ANTITUBERCULOSIS_DRUGS: dict[str, str] = {
    "rifampisin": "R",
    "rifampicin": "R",
    "isoniazid": "H",
    "pirazinamid": "Z",
    "pyrazinamide": "Z",
    "etambutol": "E",
    "ethambutol": "E",
    "streptomisin": "S",
    "streptomycin": "S",
}
"""Drug name to its single-letter regimen code, for deriving a code from a table.

A Puskesmas treatment card lists `Rifampisin 600 mg / Isoniazid 300 mg / ...`
instead of naming the regimen, so the code has to come from the drugs present.
Only these six fixed-dose companions are mapped; anything else in the table
(levofloxacin, bedaquiline) belongs to a regimen that must not be guessed.
"""

# Order the letters appear in a regimen code: the Kemenkes/WHO form is `HRZE`,
# not the order the drugs are listed in on the card.
REGIMEN_CODE_ORDER = "HRZES"

REGIMEN_PATTERN = re.compile(r"([A-Z0-9][A-Z0-9./-]{0,19})", re.IGNORECASE)
ISO_DATE_PATTERN = re.compile(r"\b(\d{4})-(\d{1,2})-(\d{1,2})\b")
NUMERIC_DATE_PATTERN = re.compile(r"\b(\d{1,2})\s*[/-]\s*(\d{1,2})\s*[/-]\s*(\d{4})\b")

DATE_LABEL_TOKENS: dict[str, tuple[str, str]] = {
    "startDate": ("mulai", "tanggal mulai"),
    "targetEndDate": ("selesai", "tanggal selesai"),
}
"""Canonical label word per date field, plus the full label to rewrite to.

Read by ``card_parser.repair_detected_labels``. A strict recognition model reads
'Selesai' as 'Selesat' and 'Mulai' as 'Mula' often enough to matter, and an
unmatched label loses the field entirely rather than misreading it.
"""


MODEL_DIR_ENV = "TIBY_OCR_MODEL_DIR"
MODEL_LOCK = Path(__file__).with_name("models.lock.json")

RAPIDOCR_PARAMS: dict[str, str] = {
    "Det.engine_type": "ONNXRUNTIME",
    "Det.lang_type": "id",
    "Det.model_type": "SMALL",
    "Det.ocr_version": "PPOCRV6",
    "Rec.engine_type": "ONNXRUNTIME",
    "Rec.lang_type": "id",
    "Rec.model_type": "SMALL",
    "Rec.ocr_version": "PPOCRV6",
    "Cls.engine_type": "ONNXRUNTIME",
    "Cls.lang_type": "multi",
    "Cls.model_type": "MOBILE",
    "Cls.ocr_version": "PPOCRV4",
}
"""Static RapidOCR parameters; the model_root_dir is injected at runtime.

Plain strings on purpose: this module must stay importable without the OCR
stack (``card_parser`` imports it). Engine/model/version values are RapidOCR
enum *member names*, resolved in ``ocr_service``.
"""
