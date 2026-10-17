"""HTTP surface of the AI service.

Every route follows the OpenCollection contract in ``shared/api-contract``
(Bruno format); all error responses
use the same ``ApiError`` envelope, and provider failures map to contract
status codes (503 not configured, 504 timeout, 502 anything else) without
leaking credentials. Dependency wiring (extractor/transcriber factories)
happens here so the providers stay free of transport and env concerns.
"""

import os

from fastapi import FastAPI, File, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from starlette.concurrency import run_in_threadpool

from .contracts import (
    ApiError,
    AudioExtractionResponse,
    CheckInRequest,
    CheckInResponse,
    GuidanceRequest,
    GuidanceResponse,
)
from .extraction.extractor import extract_check_in
from .guidance.service import GroundedAnswerer, pack_evidence
from .providers.agnes import AgnesExtractor
from .providers.base import (
    CheckInExtractor,
    ProviderConfigurationError,
    ProviderError,
    ProviderTimeoutError,
    Transcriber,
    TranscriptionError,
)
from .providers.fish import FishAudioTranscriber
from .providers.groq import GroqTranscriber
from .guidance.retrieval import SQLiteRetriever


class RuleBasedExtractor:
    """Adapter that runs the offline keyword baseline in a worker thread."""

    async def extract(self, request: CheckInRequest) -> CheckInResponse:
        return await run_in_threadpool(extract_check_in, request)


def extraction_service() -> CheckInExtractor:
    """Pick the extractor per request; ``TIBY_EXTRACTOR=rules`` for smoke tests."""
    if os.getenv("TIBY_EXTRACTOR", "agnes").lower() == "rules":
        return RuleBasedExtractor()
    return AgnesExtractor()


def transcription_service() -> Transcriber:
    """Pick the speech-to-text provider; ``TIBY_TRANSCRIBER=fish`` to switch."""
    if os.getenv("TIBY_TRANSCRIBER", "groq").lower() == "fish":
        return FishAudioTranscriber()
    return GroqTranscriber()


def api_error(status_code: int, code: str, message: str) -> JSONResponse:
    """Build the shared ``ApiError`` response envelope."""
    return JSONResponse(status_code=status_code, content=ApiError(code=code, message=message).model_dump())


EXTRACTION_ERRORS = {
    422: {"model": ApiError, "description": "Request validation failed."},
    502: {"model": ApiError, "description": "Extraction provider failed or returned invalid output."},
    503: {"model": ApiError, "description": "Extraction provider is not configured on the server."},
    504: {"model": ApiError, "description": "Extraction provider timed out."},
}
AUDIO_ERRORS = {
    413: {"model": ApiError, "description": "Audio file is empty or exceeds the 20 MB limit."},
    415: {"model": ApiError, "description": "Unsupported audio content type."},
    422: {"model": ApiError, "description": "Transcribed text does not fit the check-in transcript limits."},
    502: {"model": ApiError, "description": "Transcription or extraction provider failed."},
    503: {"model": ApiError, "description": "Transcription or extraction provider is not configured on the server."},
    504: {"model": ApiError, "description": "Transcription or extraction provider timed out."},
}
GUIDANCE_ERRORS = {
    422: {"model": ApiError, "description": "Request validation failed."},
    503: {"model": ApiError, "description": "Guidance provider is not configured on the server."},
}


app = FastAPI(
    title="Tiby AI Extraction API",
    version="1.0.0",
    description="Extracts reported facts from check-in text; does not diagnose or assign risk.",
)


@app.exception_handler(RequestValidationError)
async def request_validation_handler(_: Request, __: RequestValidationError) -> JSONResponse:
    """Wrap FastAPI's built-in request validation errors in ``ApiError``."""
    return api_error(422, "INVALID_REQUEST", "Request does not match the API contract.")


@app.get("/ai/health")
def health() -> dict[str, str]:
    """Liveness probe for orchestrators and dev scripts."""
    return {"status": "ok"}


@app.post("/ai/extractions/check-in", response_model=CheckInResponse, responses=EXTRACTION_ERRORS)
async def extract_check_in_endpoint(request: CheckInRequest) -> CheckInResponse:
    """Extract structured facts from a check-in transcript.

    Facts only: the response never contains a diagnosis, risk level, or
    treatment instruction, and null means the transcript did not state it.
    """
    try:
        return await extraction_service().extract(request)
    except ProviderConfigurationError as exc:
        return api_error(503, "INTERNAL", str(exc))
    except ProviderTimeoutError as exc:
        return api_error(504, "PROVIDER_TIMEOUT", str(exc))
    except ProviderError as exc:
        return api_error(502, "EXTRACTION_FAILED", str(exc))


@app.post("/ai/guidance", response_model=GuidanceResponse, responses=GUIDANCE_ERRORS)
async def guidance_endpoint(payload: GuidanceRequest) -> GuidanceResponse:
    """Answer a general educational question from approved-source evidence.

    Fails closed (``answer: null``) when no evidence matches or when the local
    guard detects a personal decision request such as dosing or start/stop
    questions; citations are allowlisted against the retrieved evidence.
    """
    retriever = SQLiteRetriever()
    question = payload.question
    if payload.transcript:
        question = f"{payload.question} {payload.transcript}"
    evidence = retriever.search(question, limit=4)
    if not evidence:
        return GuidanceResponse(
            answer=None,
            grounded=False,
            limitations=["Belum ada evidence yang cocok dari dokumen rujukan resmi.", "Informasi ini bukan diagnosis atau instruksi pengobatan."],
        )
    try:
        return await GroundedAnswerer().answer(payload.question, payload.transcript, pack_evidence(evidence))
    except ProviderConfigurationError as exc:
        return api_error(503, "INTERNAL", str(exc))
    except ProviderError as exc:
        return GuidanceResponse(answer=None, grounded=False, limitations=[str(exc)])


@app.post("/ai/extractions/check-in/audio", response_model=AudioExtractionResponse, responses=AUDIO_ERRORS)
async def extract_audio_endpoint(audio: UploadFile = File(...)) -> AudioExtractionResponse:
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
        return api_error(413, "INVALID_REQUEST", "Audio must be between 1 byte and 20 MB.")
    try:
        transcription = await transcriber.transcribe(content, audio.filename or "check-in.wav")
        request = CheckInRequest(transcript=transcription.text, language="id-ID")
        result = await extraction_service().extract(request)
    except ValidationError:
        return api_error(
            422, "INVALID_REQUEST", "The transcription exceeds the supported transcript length."
        )
    except ProviderConfigurationError as exc:
        return api_error(503, "INTERNAL", str(exc))
    except ProviderTimeoutError as exc:
        return api_error(504, "PROVIDER_TIMEOUT", str(exc))
    except TranscriptionError:
        return api_error(502, "EXTRACTION_FAILED", "Speech transcription failed.")
    except ProviderError:
        return api_error(502, "EXTRACTION_FAILED", "Fact extraction failed.")
    return AudioExtractionResponse(
        transcript=transcription.text,
        transcription_provider=transcription.provider,
        transcription_model=transcription.model,
        extraction=result.extraction,
        confidence=result.confidence,
        uncertainties=result.uncertainties,
    )
