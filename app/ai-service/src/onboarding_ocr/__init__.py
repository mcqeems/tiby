"""Local OCR for onboarding documents.

Four files, flat:

- ``router.py`` — the HTTP route: content types, size limits, error envelope.
- ``ocr_service.py`` — the engine. The only place OpenCV and RapidOCR appear.
- ``card_parser.py`` — the field rules. Pure, no image library, so it tests in
  milliseconds and is where every real bug has lived.
- ``constants.py`` — label patterns, thresholds, and engine parameters.
"""

from .ocr_service import extract_onboarding_card
from .router import router as api_router

__all__ = ["api_router", "extract_onboarding_card"]
