import os

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from starlette.concurrency import run_in_threadpool

from .contracts import ApiError, CheckInRequest, CheckInResponse
from .extractor import extract_check_in
from .providers.agnes import AgnesExtractor
from .providers.base import CheckInExtractor, ProviderConfigurationError, ProviderError
from .providers.groq import GroqTranscriber, SpeechToTextError


class RuleBasedExtractor:
    async def extract(self, request: CheckInRequest) -> CheckInResponse:
        return await run_in_threadpool(extract_check_in, request)


def extraction_service() -> CheckInExtractor:
    if os.getenv("TIBY_EXTRACTOR", "agnes").lower() == "rules":
        return RuleBasedExtractor()
    return AgnesExtractor()

app = FastAPI(
    title="Tiby AI Extraction API",
    version="1.0.0",
    description="Extracts reported facts from check-in text; does not diagnose or assign risk.",
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/v1/extractions/check-in")
async def extract_check_in_endpoint(payload: dict) -> object:
    try:
        request = CheckInRequest.model_validate(payload)
    except ValidationError:
        error = ApiError(code="INVALID_REQUEST", message="Request does not match the check-in contract.")
        return JSONResponse(status_code=422, content=error.model_dump())

    try:
        response = await extraction_service().extract(request)
    except ProviderConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ProviderError as exc:
        error = ApiError(code="EXTRACTION_FAILED", message=str(exc))
        return JSONResponse(status_code=502, content=error.model_dump())

    return response.model_dump()


@app.post("/v1/extractions/check-in/audio")
async def extract_audio_endpoint(audio: UploadFile = File(...)) -> object:
    transcriber = GroqTranscriber()
    if audio.content_type not in transcriber.supported_content_types:
        raise HTTPException(status_code=415, detail="Unsupported audio content type.")
    content = await audio.read(transcriber.max_upload_bytes + 1)
    if not content or len(content) > transcriber.max_upload_bytes:
        raise HTTPException(status_code=413, detail="Audio must be between 1 byte and 20 MB.")
    try:
        transcription = await transcriber.transcribe(content, audio.filename or "check-in.wav")
        transcript = transcription.text
        request = CheckInRequest(transcript=transcript, language="id-ID")
        result = await extraction_service().extract(request)
        return {
            "transcript": transcript,
            "transcription_provider": transcription.provider,
            "transcription_model": transcription.model,
            **result.model_dump(),
        }
    except SpeechToTextError:
        error = ApiError(code="EXTRACTION_FAILED", message="Speech transcription failed.")
        return JSONResponse(status_code=502, content=error.model_dump())
    except ProviderConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ProviderError:
        error = ApiError(code="EXTRACTION_FAILED", message="Fact extraction failed.")
        return JSONResponse(status_code=502, content=error.model_dump())
