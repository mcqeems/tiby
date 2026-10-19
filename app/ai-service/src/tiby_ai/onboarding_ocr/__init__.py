"""Local OCR for onboarding documents.

Four files, flat:

- ``controller.py`` — the HTTP route: content types, size limits, error envelope.
- ``ocr_service.py`` — the engine. The only place OpenCV and RapidOCR appear.
- ``card_parser.py`` — the field rules. Pure, no image library, so it tests in
  milliseconds and is where every real bug has lived.
"""

from .controller import router
from .ocr_service import extract_onboarding_card

__all__ = ["extract_onboarding_card", "router"]