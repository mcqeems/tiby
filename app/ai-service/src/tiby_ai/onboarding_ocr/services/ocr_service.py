"""Reads a card image into detected rows, and nothing more.

This is the only place that knows OpenCV and RapidOCR exist. It decodes the
upload, runs the local ONNX pipeline, and hands the detected rows — each with
the engine's own score — to :mod:`.card_parser`.

There is deliberately no image conditioning step here: no deskew, no contrast
normalisation, no upscale. That was tried and measured against the card
fixtures. PPOCRv6-small already reads a rotated, shadowed, underexposed,
0.4x-scaled photo at full field coverage on its own, and conditioning never beat
the raw image in any scenario, while upscaling a very small card made it
strictly worse. When the engine does fail, the honest signal is the per-field
confidence dropping, which is what a Nakes needs to see anyway.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Protocol, cast

import cv2
import numpy as np
from rapidocr import EngineType, ModelType, OCRVersion, RapidOCR

from ...contracts import OcrOnboardingDraft
from .card_parser import OcrLine, parse_onboarding_lines


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


def _extract_lines(image: np.ndarray) -> list[OcrLine]:
    """Run the engine and keep each row's score attached to its text."""
    result = _engine()(image)
    texts = getattr(result, "txts", None) or ()
    scores = getattr(result, "scores", None) or ()
    lines = []
    for index, text in enumerate(texts):
        if not isinstance(text, str) or not text.strip():
            continue
        raw_score = scores[index] if index < len(scores) else None
        score = float(raw_score) if isinstance(raw_score, (int, float)) else 0.0
        lines.append(OcrLine(text.strip(), score))
    return lines


def extract_onboarding_card(image_bytes: bytes) -> OcrOnboardingDraft:
    """OCR one validated image into an unconfirmed onboarding draft.

    Raises ``ValueError`` when the bytes are not a decodable image; the caller
    decides which status that becomes.
    """
    image = cv2.imdecode(np.frombuffer(image_bytes, dtype=np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Uploaded file is not a decodable image.")
    return parse_onboarding_lines(_extract_lines(image))