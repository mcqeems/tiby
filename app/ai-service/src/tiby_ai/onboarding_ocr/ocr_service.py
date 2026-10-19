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

Model weights are hash-locked and verified *before* the engine is built, because
RapidOCR's own behaviour when a weight file is missing is to download ~30 MB
from ModelScope on the spot. In production that turns a cold start into a
network dependency and lets an unverified file load silently. Pre-stage the
files and point ``TIBY_OCR_MODEL_DIR`` at them; a missing or mismatched weight
raises :class:`OcrModelError` instead of reaching for the network.
"""

from __future__ import annotations

import hashlib
import json
import os
from functools import lru_cache
from pathlib import Path
from typing import NamedTuple, Protocol, cast

import cv2
import numpy as np
from rapidocr import EngineType, ModelType, OCRVersion, RapidOCR

from ..contracts import OcrOnboardingDraft
from .card_parser import OcrLine, parse_onboarding_lines

MODEL_DIR_ENV = "TIBY_OCR_MODEL_DIR"
MODEL_LOCK = Path(__file__).with_name("models.lock.json")
def _default_model_dir() -> Path:
    """The cache RapidOCR ships with, found through the installed package.

    Resolved from ``rapidocr`` rather than by walking up to ``.venv``: the
    interpreter version in the path changes, and this does not.
    """
    import rapidocr

    return Path(rapidocr.__file__).parent / "models"


class OcrModelError(RuntimeError):
    """A weight file is missing or does not match the lock. Never a download."""


class LockedModel(NamedTuple):
    name: str
    sha256: str


def locked_models() -> list[LockedModel]:
    lock = json.loads(MODEL_LOCK.read_text(encoding="utf-8"))
    return [LockedModel(name, sha) for name, sha in sorted(lock["models"].items())]


def model_dir() -> Path:
    """Where weights must already be, staged ahead of time."""
    override = os.getenv(MODEL_DIR_ENV)
    return Path(override) if override else _default_model_dir()


def verify_models(directory: Path | None = None) -> None:
    """Check every locked weight is present and byte-for-byte correct.

    Called before the engine is constructed, which is the only point where
    refusing is cheap. Once RapidOCR has been built it has already reached the
    network, and by then a bad file is indistinguishable from a good one.
    """
    root = directory or model_dir()
    for model in locked_models():
        path = root / model.name
        if not path.is_file():
            raise OcrModelError(
                f"{model.name} is missing from {root}. Stage the OCR weights there "
                f"first (see models.lock.json); they are never downloaded at runtime."
            )
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if digest != model.sha256:
            raise OcrModelError(
                f"{model.name} does not match models.lock.json "
                f"(expected {model.sha256[:12]}…, got {digest[:12]}…). "
                f"Refusing to run OCR on unverified weights."
            )


class OcrEngine(Protocol):
    def __call__(self, image: np.ndarray) -> object: ...


@lru_cache(maxsize=1)
def _engine() -> OcrEngine:
    """Load one local ONNX model pipeline per worker process."""
    verify_models()
    return cast(
        OcrEngine,
        RapidOCR(
            params={
                "Global.model_root_dir": model_dir(),
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