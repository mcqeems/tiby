"""Central place for everything error-related in the AI service.

Kept out of :mod:`main` so that:
- controllers/services can raise typed exceptions without importing the app,
- error envelopes and OpenAPI response docs are defined in one place,
- ``main.py`` stays focused on wiring (app + routes + handlers).
"""

from typing import Any, Literal

from fastapi.responses import JSONResponse

from contracts import ApiError


ApiErrorCode = Literal[
    "INVALID_REQUEST",
    "EXTRACTION_FAILED",
    "PROVIDER_TIMEOUT",
    "PROVIDER_FAILED",
    "PROVIDER_NOT_CONFIGURED",
    "INTERNAL",
]


# ---------------------------------------------------------------------------
# Response envelope helper
# ---------------------------------------------------------------------------
def api_error(status_code: int, code: ApiErrorCode | str, message: str) -> JSONResponse:
    """Build the shared ``ApiError`` response envelope."""
    return JSONResponse(
        status_code=status_code,
        content=ApiError(code=code, message=message).model_dump(),
    )


# ---------------------------------------------------------------------------
# Typed exceptions
# ---------------------------------------------------------------------------
class AppException(Exception):
    """Base for every application error that should render as ``ApiError``."""

    def __init__(self, status_code: int, code: ApiErrorCode, message: str):
        self.status_code = status_code
        self.code = code
        self.message = message
        super().__init__(message)


# --- Extraction ---
class ExtractionProviderFailed(AppException):
    def __init__(self):
        super().__init__(
            502,
            "EXTRACTION_FAILED",
            "Extraction provider failed or returned invalid output.",
        )


class ExtractionNotConfigured(AppException):
    def __init__(self):
        super().__init__(
            503,
            "PROVIDER_NOT_CONFIGURED",
            "Extraction provider is not configured on the server.",
        )


class ExtractionTimeout(AppException):
    def __init__(self):
        super().__init__(504, "PROVIDER_TIMEOUT", "Extraction provider timed out.")


# --- Audio / Transcription ---
class AudioFileInvalid(AppException):
    def __init__(self):
        super().__init__(
            413, "INVALID_REQUEST", "Audio file is empty or exceeds the 10 MB limit."
        )


class AudioUnsupportedType(AppException):
    def __init__(self):
        super().__init__(415, "INVALID_REQUEST", "Unsupported audio content type.")


class TranscriptionFailed(AppException):
    def __init__(self):
        super().__init__(502, "EXTRACTION_FAILED", "Speech transcription failed.")


class TranscriptionNotConfigured(AppException):
    def __init__(self):
        super().__init__(
            503,
            "PROVIDER_NOT_CONFIGURED",
            "Transcription provider is not configured on the server.",
        )


class TranscriptionTimeout(AppException):
    def __init__(self):
        super().__init__(504, "PROVIDER_TIMEOUT", "Transcription provider timed out.")


# --- Guidance ---
class GuidanceNotConfigured(AppException):
    def __init__(self):
        super().__init__(
            503,
            "PROVIDER_NOT_CONFIGURED",
            "Guidance provider is not configured on the server.",
        )


EXTRACTION_ERRORS: dict[int | str, dict[str, Any]] = {
    422: {"model": ApiError, "description": "Request validation failed."},
    502: {
        "model": ApiError,
        "description": "Extraction provider failed or returned invalid output.",
    },
    503: {
        "model": ApiError,
        "description": "Extraction provider is not configured on the server.",
    },
    504: {"model": ApiError, "description": "Extraction provider timed out."},
}

AUDIO_ERRORS: dict[int | str, dict[str, Any]] = {
    413: {
        "model": ApiError,
        "description": "Audio file is empty or exceeds the 10 MB limit.",
    },
    415: {"model": ApiError, "description": "Unsupported audio content type."},
    502: {"model": ApiError, "description": "Transcription provider failed."},
    503: {
        "model": ApiError,
        "description": "Transcription provider is not configured on the server.",
    },
    504: {"model": ApiError, "description": "Transcription provider timed out."},
}

GUIDANCE_ERRORS: dict[int | str, dict[str, Any]] = {
    422: {"model": ApiError, "description": "Request validation failed."},
    503: {
        "model": ApiError,
        "description": "Guidance provider is not configured on the server.",
    },
}
