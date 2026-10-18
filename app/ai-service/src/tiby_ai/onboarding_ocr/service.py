"""Turn a card image into a cautious, human-reviewed onboarding draft.

OCR is deliberately kept separate from HTTP wiring and field parsing. It is a
best-effort transcription tool, not a source of clinical or identity truth.
"""

from __future__ import annotations

import re
from functools import lru_cache
from typing import Protocol, cast

import numpy as np
from rapidocr import EngineType, ModelType, OCRVersion, RapidOCR

from ..contracts import OcrOnboardingDraft


class OcrEngine(Protocol):
    def __call__(self, image: np.ndarray) -> object: ...


@lru_cache(maxsize=1)
def _engine() -> OcrEngine:
    """Load one local ONNX model pipeline per worker process."""
    return cast(
        OcrEngine,
        RapidOCR(
            params={
                "Det.engine_type": EngineType.ONNXRUNTIME,
                "Det.lang_type": "id",
                "Det.model_type": ModelType.SMALL,
                "Det.ocr_version": OCRVersion.PPOCRV6,
                "Rec.engine_type": EngineType.ONNXRUNTIME,
                "Rec.lang_type": "id",
                "Rec.model_type": ModelType.SMALL,
                "Rec.ocr_version": OCRVersion.PPOCRV6,
                "Cls.engine_type": EngineType.ONNXRUNTIME,
                "Cls.lang_type": "multi",
                "Cls.model_type": ModelType.MOBILE,
                "Cls.ocr_version": OCRVersion.PPOCRV4,
            },
        ),
    )


def _extract_text(
    image: np.ndarray, engine: OcrEngine | None = None
) -> tuple[str, float]:
    result = (engine or _engine())(image)
    text_lines = getattr(result, "txts", None) or ()
    scores = getattr(result, "scores", None) or ()
    lines = [
        line.strip() for line in text_lines if isinstance(line, str) and line.strip()
    ]
    score_values = [float(score) for score in scores if isinstance(score, (int, float))]
    confidence = sum(score_values) / len(score_values) if score_values else 0.0
    return "\n".join(lines), confidence


def _field(pattern: str, text: str) -> str | None:
    match = re.search(pattern, text, flags=re.IGNORECASE | re.MULTILINE)
    return match.group(1).strip(" \t:.-") if match else None


def _parse_quota(text: str) -> int | None:
    raw = _field(r"(?:kuota\s*(?:pil|obat)?|dosis\s*harian)\s*[:=-]?\s*(\d+)", text)
    return int(raw) if raw else None


def _parse_date(text: str, label: str) -> str | None:
    raw = _field(
        rf"{label}\s*[:=-]?\s*(\d{{1,2}}[/-]\d{{1,2}}[/-]\d{{4}}|\d{{4}}-\d{{2}}-\d{{2}})",
        text,
    )
    if not raw:
        return None
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", raw):
        return raw
    day, month, year = re.split(r"[/-]", raw)
    return f"{year}-{int(month):02d}-{int(day):02d}"


def parse_onboarding_text(text: str, confidence: float) -> OcrOnboardingDraft:
    """Extract only explicitly labelled values; leave ambiguous fields blank."""
    regimen = _field(
        r"(?:regimen|paduan\s*obat)\s*[:=-]?\s*([A-Z0-9][A-Z0-9-]{1,20})", text
    )
    patient_name = _field(r"(?:nama\s*pasien|nama)\s*[:=-]\s*([^\n]+)", text)
    return OcrOnboardingDraft(
        patientName=patient_name,
        regimenCode=regimen.upper() if regimen else None,
        dailyPillQuota=_parse_quota(text),
        startDate=_parse_date(text, r"(?:tanggal\s*mulai|mulai\s*berobat)"),
        targetEndDate=_parse_date(text, r"(?:tanggal\s*selesai|target\s*selesai)"),
        confidence=max(0.0, min(confidence, 1.0)),
        rawText=text,
    )


def extract_onboarding_card(image_bytes: bytes) -> OcrOnboardingDraft:
    """OCR one validated image using the local RapidOCR engine."""
    import cv2

    image = cv2.imdecode(np.frombuffer(image_bytes, dtype=np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Uploaded file is not a decodable image.")
    text, confidence = _extract_text(image)
    return parse_onboarding_text(text, confidence)
