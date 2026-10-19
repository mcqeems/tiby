"""Application orchestration for check-in and audio extraction."""

from pydantic import ValidationError

from contracts import CheckInRequest, CheckInResponse
from providers.base import CheckInExtractor, Transcriber


async def extract_check_in(extractor: CheckInExtractor, request: CheckInRequest) -> CheckInResponse:
    return await extractor.extract(request)


async def extract_audio(
    transcriber: Transcriber, extractor: CheckInExtractor, content: bytes, filename: str
):
    """Transcribe audio and extract facts, preserving contract validation."""
    transcription = await transcriber.transcribe(content, filename)
    request = CheckInRequest(transcript=transcription.text, language="id-ID")
    result = await extractor.extract(request)
    return transcription, result


__all__ = ["ValidationError", "extract_audio", "extract_check_in"]
