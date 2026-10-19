"""Onboarding-card OCR module.

Mirrors the backend's NestJS module: it declares the routes this domain owns and
re-exports the service other layers are allowed to call. NestJS does dependency
injection through ``@Module``; the FastAPI equivalent is a router plus the
service object, assembled here so nothing else has to know the layout inside.
"""

from .controllers.ocr_controller import router
from .services.ocr_service import extract_onboarding_card

__all__ = ["extract_onboarding_card", "router"]