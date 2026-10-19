"""HTTP surface of the AI service.

Every route follows the OpenCollection contract in ``shared/api-contract``
(Bruno format); all error responses
use the same ``ApiError`` envelope, and provider failures map to contract
status codes (503 not configured, 504 timeout, 502 anything else) without
leaking credentials. Dependency wiring (extractor/transcriber factories)
happens here so the providers stay free of transport and env concerns.
"""

from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, File, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from .contracts import (
    AiAudioExtractionResponse,
    ApiError,
    AudioExtractionResponse,
    CheckInRequest,
    GuidanceRequest,
    GuidanceResponse,
)
from .errors import api_error
from .extraction.mapper import to_backend_extraction
from .extraction.service import extract_audio
from .extraction.service import extract_check_in as run_extraction
from .guidance.retrieval import SQLiteRetriever
from .guidance.service import GroundedAnswerer, pack_evidence
from .onboarding_ocr import router as onboarding_ocr_router
from .providers.base import (
    ProviderConfigurationError,
    ProviderError,
    ProviderTimeoutError,
    TranscriptionError,
)
from .providers.factory import (
    extraction_service,
    transcription_service,
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
    422: {
        "model": ApiError,
        "description": "Transcribed text does not fit the check-in transcript limits.",
    },
    502: {
        "model": ApiError,
        "description": "Transcription or extraction provider failed.",
    },
    503: {
        "model": ApiError,
        "description": "Transcription or extraction provider is not configured on the server.",
    },
    504: {
        "model": ApiError,
        "description": "Transcription or extraction provider timed out.",
    },
}


GUIDANCE_ERRORS: dict[int | str, dict[str, Any]] = {
    422: {"model": ApiError, "description": "Request validation failed."},
    503: {
        "model": ApiError,
        "description": "Guidance provider is not configured on the server.",
    },
}


@asynccontextmanager
async def lifespan(application: FastAPI):
    """Reuse the stateless retriever and lazily initialize provider-backed answerer."""
    application.state.guidance_retriever = SQLiteRetriever()
    application.state.guidance_answerer = None
    yield


app = FastAPI(
    title="Tiby AI Extraction API",
    version="1.0.0",
    description="Extracts reported facts from check-in text; does not diagnose or assign risk.",
    lifespan=lifespan,
)

# Domain modules own their own routes, the way each NestJS module declares its
# controllers; this file only composes the application.
app.include_router(onboarding_ocr_router)


@app.exception_handler(RequestValidationError)
async def request_validation_handler(
    _: Request, __: RequestValidationError
) -> JSONResponse:
    """Wrap FastAPI's built-in request validation errors in ``ApiError``."""
    return api_error(422, "INVALID_REQUEST", "Request does not match the API contract.")


@app.get("/ai/health")
def health() -> dict[str, str]:
    """Liveness probe for orchestrators and dev scripts."""
    return {"status": "ok"}


@app.post(
    "/ai/extractions/check-in",
    response_model=AiAudioExtractionResponse,
    response_model_exclude_unset=True,
    responses=EXTRACTION_ERRORS,
)
@app.post(
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
        result = await run_extraction(extraction_service(), request)
        return to_backend_extraction(request.transcript, result)
    except ProviderConfigurationError as exc:
        return api_error(503, "INTERNAL", str(exc))
    except ProviderTimeoutError as exc:
        return api_error(504, "PROVIDER_TIMEOUT", str(exc))
    except ProviderError as exc:
        return api_error(502, "EXTRACTION_FAILED", str(exc))


@app.post("/ai/guidance", response_model=GuidanceResponse, responses=GUIDANCE_ERRORS)
async def guidance_endpoint(
    payload: GuidanceRequest, request: Request,
) -> GuidanceResponse | JSONResponse:
    """Answer a general educational question from approved-source evidence.

    Fails closed (``answer: null``) when no evidence matches or when the local
    guard detects a personal decision request such as dosing or start/stop
    questions; citations are allowlisted against the retrieved evidence.
    """
    retriever = getattr(request.app.state, "guidance_retriever", None)
    if retriever is None:
        retriever = request.app.state.guidance_retriever = SQLiteRetriever()
    question = payload.question
    if payload.transcript:
        question = f"{payload.question} {payload.transcript}"
    evidence = retriever.search(question, limit=4)
    if not evidence:
        return GuidanceResponse(
            answer=None,
            grounded=False,
            limitations=[
                "Belum ada evidence yang cocok dari dokumen rujukan resmi.",
                "Informasi ini bukan diagnosis atau instruksi pengobatan.",
            ],
        )
    try:
        if getattr(request.app.state, "guidance_answerer", None) is None:
            request.app.state.guidance_answerer = GroundedAnswerer()
        return await request.app.state.guidance_answerer.answer(
            payload.question, payload.transcript, pack_evidence(evidence)
        )
    except ProviderConfigurationError as exc:
        return api_error(503, "INTERNAL", str(exc))
    except ProviderError as exc:
        return GuidanceResponse(answer=None, grounded=False, limitations=[str(exc)])


@app.post(
    "/ai/extractions/check-in/audio",
    response_model=AudioExtractionResponse,
    response_model_exclude_unset=True,
    responses=AUDIO_ERRORS,
)
@app.post(
    "/audio/extract",
    response_model=AudioExtractionResponse,
    response_model_exclude_unset=True,
    responses=AUDIO_ERRORS,
    include_in_schema=False,
)
async def extract_audio_endpoint(
    audio: UploadFile = File(...),  # noqa: B008 - FastAPI requires File metadata here.
) -> AudioExtractionResponse | JSONResponse:
    """Transcribe an uploaded check-in audio file, then extract facts.

    Limits and content types come from the active transcriber; a transcription
    that exceeds the check-in transcript contract is rejected with 422 rather
    than silently truncated.
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
        transcription, result = await extract_audio(
            transcriber,
            extraction_service(),
            content,
            audio.filename or "check-in.wav",
        )
    except ValidationError:
        return api_error(
            422,
            "INVALID_REQUEST",
            "The transcription exceeds the supported transcript length.",
        )
    except ProviderConfigurationError as exc:
        return api_error(503, "INTERNAL", str(exc))
    except ProviderTimeoutError as exc:
        return api_error(504, "PROVIDER_TIMEOUT", str(exc))
    except TranscriptionError:
        return api_error(502, "EXTRACTION_FAILED", "Speech transcription failed.")
    except ProviderError:
        return api_error(502, "EXTRACTION_FAILED", "Fact extraction failed.")
    adapted = to_backend_extraction(transcription.text, result)
    return AudioExtractionResponse(
        **adapted.model_dump(exclude_unset=True),
        transcription_provider=transcription.provider,
        transcription_model=transcription.model,
    )
