"""Environment-backed provider selection, kept outside HTTP and domain code."""

import logging
import os
from collections.abc import Callable, Mapping

from starlette.concurrency import run_in_threadpool

from contracts import CheckInRequest, CheckInResponse
from extraction.extractor import extract_check_in
from providers.agnes import AgnesExtractor
from providers.base import CheckInExtractor, Transcriber
from providers.fish import FishAudioTranscriber
from providers.groq import GroqTranscriber

logger = logging.getLogger(__name__)


class RuleBasedExtractor:
    """Adapter that runs the offline keyword baseline in a worker thread."""

    async def extract(self, request: CheckInRequest) -> CheckInResponse:
        return await run_in_threadpool(extract_check_in, request)


EXTRACTORS: Mapping[str, Callable[[], CheckInExtractor]] = {
    "agnes": AgnesExtractor,
    "rules": RuleBasedExtractor,
}
TRANSCRIBERS: Mapping[str, Callable[[], Transcriber]] = {
    "groq": GroqTranscriber,
    "fish": FishAudioTranscriber,
}
"""Every accepted value. An unrecognised one is a configuration mistake, not
an invitation to silently fall back to a paid provider."""


def _setting(name: str, default: str, choices: Mapping[str, object]) -> str:
    value = os.getenv(name, default).strip().lower()
    if value not in choices:
        raise ValueError(
            f"{name}={value!r} is not one of {sorted(choices)}. "
            f"Set it explicitly so a typo never runs the wrong provider."
        )
    return value


def extraction_service() -> CheckInExtractor:
    """Build the configured check-in extractor.

    The real provider is the default and a missing token surfaces as 503 from
    the caller. ``rules`` is for offline work only, so it announces itself at
    startup: otherwise a screenshot of a passing local check looks exactly like
    a passing model check, and nobody can tell them apart.
    """
    name = _setting("TIBY_EXTRACTOR", "agnes", EXTRACTORS)
    if name == "rules":
        logger.warning(
            "TIBY_EXTRACTOR=rules — extraction is running the offline keyword "
            "baseline, not the model. Results are QA fixtures, not validated output."
        )
    return EXTRACTORS[name]()


def transcription_service() -> Transcriber:
    """Build the configured speech-to-text provider."""
    name = _setting("TIBY_TRANSCRIBER", "groq", TRANSCRIBERS)
    return TRANSCRIBERS[name]()