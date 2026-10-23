"""Application orchestration for check-in extraction."""

from pydantic import ValidationError

from contracts import CheckInRequest, CheckInResponse
from providers.base import CheckInExtractor, Transcriber


async def extract_check_in(extractor: CheckInExtractor, request: CheckInRequest) -> CheckInResponse:
    return await extractor.extract(request)


async def transcribe_audio(transcriber: Transcriber, content: bytes, filename: str):
    """Transcribe audio only; fact extraction happens after the patient confirms."""
    return await transcriber.transcribe(content, filename)


__all__ = ["ValidationError", "extract_check_in", "transcribe_audio"]
