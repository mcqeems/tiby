"""Environment-backed provider selection, kept outside HTTP and domain code."""

import logging
import os
from collections.abc import Callable

from starlette.concurrency import run_in_threadpool

from contracts import CheckInRequest, CheckInResponse
from extraction.extractor import extract_check_in
from providers.agnes import AgnesExtractor
from providers.base import CheckInExtractor, Transcriber
from providers.fish import FishAudioTranscriber
from providers.groq import GroqTranscriber

logger = logging.getLogger(__name__)


# rule-based fallback
class RuleBasedExtractor:
    """Adapter that runs the offline keyword baseline in a worker thread."""

    async def extract(self, request: CheckInRequest) -> CheckInResponse:
        return await run_in_threadpool(extract_check_in, request)


# registry
EXTRACTORS: dict[str, Callable[[], CheckInExtractor]] = {
    "agnes": AgnesExtractor,
    "rules": RuleBasedExtractor,
}
TRANSCRIBERS: dict[str, Callable[[], Transcriber]] = {
    "groq": GroqTranscriber,
    "fish": FishAudioTranscriber,
}


def _pick(env_name: str, default: str, choices: dict[str, object]) -> str:
    value = os.getenv(env_name, default).strip().lower()
    if value not in choices:
        raise ValueError(
            f"{env_name}={value!r} is not one of {sorted(choices)}. "
            f"Set it explicitly so a typo never runs the wrong provider."
        )
    return value


def extraction_service() -> CheckInExtractor:
    """Build the configured check-in extractor."""
    name = _pick("TIBY_EXTRACTOR", "agnes", EXTRACTORS)
    if name == "rules":
        logger.warning(
            "TIBY_EXTRACTOR=rules — extraction is running the offline keyword "
            "baseline, not the model. Results are QA fixtures, not validated output."
        )
    return EXTRACTORS[name]()


def transcription_service() -> Transcriber:
    """Build the configured speech-to-text provider."""
    name = _pick("TIBY_TRANSCRIBER", "groq", TRANSCRIBERS)
    return TRANSCRIBERS[name]()
