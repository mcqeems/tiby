"""Central place for the shared error envelope and OpenAPI response docs.

Kept out of :mod:`main` so routers can build error responses without importing
the app, and so ``main.py`` stays focused on wiring.
"""

from typing import Any, Literal

from fastapi.responses import JSONResponse

from contracts import ApiError

ApiErrorCode = Literal[
    "INVALID_REQUEST",
    "EXTRACTION_FAILED",
    "PROVIDER_TIMEOUT",
    "INTERNAL",
]


# ---------------------------------------------------------------------------
# Response envelope helper
# ---------------------------------------------------------------------------
def api_error(status_code: int, code: ApiErrorCode, message: str) -> JSONResponse:
    """Build the shared ``ApiError`` response envelope."""
    return JSONResponse(
        status_code=status_code,
        content=ApiError(code=code, message=message).model_dump(),
    )


# ---------------------------------------------------------------------------
# OpenAPI response docs
# ---------------------------------------------------------------------------
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
