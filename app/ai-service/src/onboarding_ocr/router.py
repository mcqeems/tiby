"""HTTP surface for onboarding-card OCR.

Route wiring only: content types, the upload ceiling, and the mapping onto the
shared ``ApiError`` envelope. No OCR and no parsing happens here, so the rules
in :mod:`.card_parser` stay testable without a request.
"""

from fastapi import APIRouter, File, UploadFile
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool

from contracts import ApiError, OcrOnboardingDraft
from errors import api_error
from onboarding_ocr.ocr_service import OcrModelError, extract_onboarding_card

SUPPORTED_CONTENT_TYPES = frozenset(
    {"image/png", "image/jpeg", "image/jpg", "image/webp"}
)
MAX_UPLOAD_BYTES = 10 * 1024 * 1024

router = APIRouter()

ERRORS: dict[int | str, dict[str, object]] = {
    413: {
        "model": ApiError,
        "description": "Image is empty or exceeds the 10 MB limit.",
    },
    415: {"model": ApiError, "description": "Unsupported image content type."},
    422: {"model": ApiError, "description": "Image could not be decoded."},
}


@router.post(
    "/ai/ocr/extract",
    response_model=OcrOnboardingDraft,
    responses=ERRORS,
    summary="Read a treatment card into an unconfirmed onboarding draft",
)
# Contract-facing route above; the unprefixed path stays as the backend alias
# and is kept out of the schema, the same way ``main.py`` hides ``/text/extract``.
@router.post(
    "/ocr/extract",
    response_model=OcrOnboardingDraft,
    responses=ERRORS,
    include_in_schema=False,
)
async def extract_onboarding_card_endpoint(
    cardImage: UploadFile = File(...),  # noqa: B008 - FastAPI requires File metadata here.
) -> OcrOnboardingDraft | JSONResponse:
    """Return an OCR draft; a Nakes must verify every field against the image."""
    if cardImage.content_type not in SUPPORTED_CONTENT_TYPES:
        return api_error(415, "INVALID_REQUEST", "Unsupported image content type.")
    content = await cardImage.read(MAX_UPLOAD_BYTES + 1)
    if not content or len(content) > MAX_UPLOAD_BYTES:
        return api_error(
            413, "INVALID_REQUEST", "Image must be between 1 byte and 10 MB."
        )
    try:
        return await run_in_threadpool(extract_onboarding_card, content)
    except OcrModelError as exc:
        # Weights were not staged, or do not match the lock. Same shape as a
        # missing provider token: the service is configured wrong, not the
        # request.
        return api_error(503, "INTERNAL", str(exc))
    except ValueError:
        return api_error(
            422, "INVALID_REQUEST", "Uploaded file is not a decodable image."
        )

