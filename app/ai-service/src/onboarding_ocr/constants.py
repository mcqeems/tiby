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
    ("patientName", rf"{LABEL_START}nama\s*pasien\b{SEPARATOR}"),
    ("regimenCode", rf"{LABEL_START}(?:regimen|paduan\s*obat)\b{SEPARATOR}"),
    (
        "dailyPillQuota",
        rf"{LABEL_START}(?:kuota(?:\s*(?:pil|obat))?|dosis(?:\s*harian)?|jumlah\s*obat)\b{SEPARATOR}",
    ),
    ("startDate", rf"{LABEL_START}(?:tanggal\s*mulai|mulai\s*berobat)\b{SEPARATOR}"),
    (
        "targetEndDate",
        rf"{LABEL_START}(?:tanggal\s*selesai|target\s*selesai)\b{SEPARATOR}",
    ),
    ("patientName", rf"{LABEL_START}nama\b{SEPARATOR}"),
    (None, rf"{LABEL_START}tanggal\b{SEPARATOR}"),
    (
        None,
        rf"{LABEL_START}(?:no\.?\s*rm|no\.?\s*rekam\s*medis|alamat|no\.?\s*hp|telepon|faskes|catatan|keterangan)\b{SEPARATOR}",
    ),
)
"""Longest and most specific label first: a later match inside an already
claimed span is skipped, so ``Nama Pasien`` never also reads as ``Nama``."""

COMPILED_LABELS = tuple(
    (field, re.compile(pattern, re.IGNORECASE)) for field, pattern in _LABELS
)

QUOTA_PATTERN = re.compile(r"(\d{1,3})")
REGIMEN_PATTERN = re.compile(r"([A-Z0-9][A-Z0-9./-]{0,19})", re.IGNORECASE)
ISO_DATE_PATTERN = re.compile(r"\b(\d{4})-(\d{1,2})-(\d{1,2})\b")
NUMERIC_DATE_PATTERN = re.compile(r"\b(\d{1,2})\s*[/-]\s*(\d{1,2})\s*[/-]\s*(\d{4})\b")


MODEL_DIR_ENV = "TIBY_OCR_MODEL_DIR"
MODEL_LOCK = Path(__file__).with_name("models.lock.json")

RAPIDOCR_PARAMS: dict[str, str] = {
    "Det.engine_type": "onnxruntime",
    "Det.lang_type": "id",
    "Det.model_type": "small",
    "Det.ocr_version": "PPOCRV6",
    "Rec.engine_type": "onnxruntime",
    "Rec.lang_type": "id",
    "Rec.model_type": "small",
    "Rec.ocr_version": "PPOCRV6",
    "Cls.engine_type": "onnxruntime",
    "Cls.lang_type": "multi",
    "Cls.model_type": "mobile",
    "Cls.ocr_version": "PPOCRV4",
}
"""Static RapidOCR parameters; the model_root_dir is injected at runtime."""
