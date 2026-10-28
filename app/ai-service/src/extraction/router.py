"""HTTP routes for extraction + audio transcription.

Thin layer: validate input, call service, map provider errors to
``ApiError`` envelopes. Business logic lives in ``extraction.service``.
"""

from fastapi import APIRouter, File, UploadFile
from fastapi.responses import JSONResponse

from contracts import AiAudioExtractionResponse, CheckInRequest, TranscriptResponse
from errors import AUDIO_ERRORS, EXTRACTION_ERRORS, api_error
from extraction.extractor import to_backend_extraction
from providers.base import (
    ProviderConfigurationError,
    ProviderError,
    ProviderTimeoutError,
)
from providers.factory import extraction_service, transcription_service

router = APIRouter(tags=["extraction"])

router = APIRouter(tags=["extraction"])


@router.post(
    "/ai/extractions/check-in",
    response_model=AiAudioExtractionResponse,
    response_model_exclude_unset=True,
    responses=EXTRACTION_ERRORS,
)
@router.post(
    "/text/extract",
    response_model=AiAudioExtractionResponse,
    response_model_exclude_unset=True,
    responses=EXTRACTION_ERRORS,
    include_in_schema=False,
)
async def extract_check_in_endpoint(
    request: CheckInRequest,
) -> AiAudioExtractionResponse | JSONResponse:
    """Extract structured facts from a check-in transcript.

    Facts only: the response never contains a diagnosis, risk level, or
    treatment instruction, and null means the transcript did not state it.
    """
    try:
        result = await extraction_service().extract(request)
        return to_backend_extraction(request.transcript, result)
    except ProviderConfigurationError as exc:
        return api_error(503, "INTERNAL", str(exc))
    except ProviderTimeoutError as exc:
        return api_error(504, "PROVIDER_TIMEOUT", str(exc))
    except ProviderError as exc:
        return api_error(502, "EXTRACTION_FAILED", str(exc))


# audio transcription
@router.post(
    "/ai/extractions/check-in/audio",
    response_model=TranscriptResponse,
    response_model_exclude_unset=True,
    responses=AUDIO_ERRORS,
)
@router.post(
    "/audio/extract",
    response_model=TranscriptResponse,
    response_model_exclude_unset=True,
    responses=AUDIO_ERRORS,
    include_in_schema=False,
)
async def extract_audio_endpoint(
    audio: UploadFile = File(...),  # noqa: B008 - FastAPI requires File metadata here.
) -> TranscriptResponse | JSONResponse:
    """Transcribe an uploaded check-in audio file.

    The response carries the transcript only: facts are extracted in a second,
    JSON call (``/ai/extractions/check-in``) after the patient confirms or
    corrects the transcript. Every other outcome is a JSON body, errors
    included, so the bridge never has to parse prose.
    """
    transcriber = transcription_service()
    if audio.content_type not in transcriber.supported_content_types:
        return api_error(415, "INVALID_REQUEST", "Unsupported audio content type.")
    content = await audio.read(transcriber.max_upload_bytes + 1)
    if not content or len(content) > transcriber.max_upload_bytes:
        return api_error(
            413, "INVALID_REQUEST", "Audio must be between 1 byte and 10 MB."
        )
    try:
        transcription = await transcriber.transcribe(
            content, audio.filename or "check-in.wav"
        )
    except ProviderConfigurationError as exc:
        return api_error(503, "INTERNAL", str(exc))
    except ProviderTimeoutError as exc:
        return api_error(504, "PROVIDER_TIMEOUT", str(exc))
    except ProviderError:
        return api_error(502, "EXTRACTION_FAILED", "Speech transcription failed.")
    return TranscriptResponse(transcript=transcription.text)
