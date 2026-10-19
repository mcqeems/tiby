"""The single error envelope every non-2xx response uses.

Kept out of :mod:`main` so controllers can build failures without
importing the application that mounts them.
"""

from typing import Literal

from fastapi.responses import JSONResponse

from contracts import ApiError

ApiErrorCode = Literal[
    "INVALID_REQUEST", "EXTRACTION_FAILED", "PROVIDER_TIMEOUT", "INTERNAL"
]


def api_error(status_code: int, code: ApiErrorCode, message: str) -> JSONResponse:
    """Build the shared ``ApiError`` response envelope."""
    return JSONResponse(
        status_code=status_code,
        content=ApiError(code=code, message=message).model_dump(),
    )