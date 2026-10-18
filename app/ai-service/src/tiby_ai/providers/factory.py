"""Environment-backed provider selection, kept outside HTTP and domain code."""

import os

from starlette.concurrency import run_in_threadpool

from ..contracts import CheckInRequest, CheckInResponse
from ..extraction.extractor import extract_check_in
from .agnes import AgnesExtractor
from .base import CheckInExtractor, Transcriber
from .fish import FishAudioTranscriber
from .groq import GroqTranscriber


class RuleBasedExtractor:
    """Adapter that runs the offline keyword baseline in a worker thread."""

    async def extract(self, request: CheckInRequest) -> CheckInResponse:
        return await run_in_threadpool(extract_check_in, request)


def extraction_service() -> CheckInExtractor:
    """Build the configured check-in extractor."""
    if os.getenv("TIBY_EXTRACTOR", "agnes").lower() == "rules":
        return RuleBasedExtractor()
    return AgnesExtractor()


def transcription_service() -> Transcriber:
    """Build the configured speech-to-text provider."""
    if os.getenv("TIBY_TRANSCRIBER", "groq").lower() == "fish":
        return FishAudioTranscriber()
    return GroqTranscriber()
