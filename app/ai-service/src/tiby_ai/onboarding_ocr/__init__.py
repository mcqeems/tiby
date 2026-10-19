"""Local OCR for onboarding documents.

Layered the way the backend's NestJS modules are, so a reader coming from
``modules/onboarding`` finds the same shape here:

- ``controllers/`` — HTTP wiring: content types, size limits, error envelope.
- ``services/`` — the use cases. ``ocr_service`` owns the engine; ``card_parser``
  holds the pure field rules and has no OCR or image-library dependency.

``module.py`` assembles the two, mirroring ``*.module.ts``.
"""

from .module import extract_onboarding_card, router

__all__ = ["extract_onboarding_card", "router"]