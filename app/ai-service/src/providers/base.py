"""Provider-facing types shared by the HTTP layer.

Error taxonomy lets routes map failures onto contract status codes:
503 not configured, 504 timeout, 502 everything else.
"""

from dataclasses import dataclass

from contracts import CheckInRequest, CheckInResponse


@dataclass(frozen=True)
class Transcription:
    """Result of one speech-to-text run."""

    text: str
    provider: str
    model: str


# --- Protocols (kontrak interface) ---
class CheckInExtractor(Protocol):
    """Anything that turns a check-in request into extracted facts."""

    async def extract(self, request: CheckInRequest) -> CheckInResponse: ...


class Transcriber(Protocol):
    """Speech-to-text adapter contract."""

    supported_content_types: set[str]
    max_upload_bytes: int

    async def transcribe(
        self, audio: bytes, filename: str = "check-in.wav"
    ) -> Transcription: ...


# --- Error taxonomy ---
class ProviderConfigurationError(RuntimeError):
    """Credentials or endpoint missing."""


class ProviderError(RuntimeError):
    """Any provider failure other than timeout/config."""


class ProviderTimeoutError(ProviderError):
    """Upstream call timed out."""


class TranscriptionError(ProviderError):
    """Speech-to-text failed."""


# --- Env helpers ---
import os


def env_str(key: str, default: str = "") -> str:
    return os.getenv(key, default).strip()


def env_float(key: str, default: float) -> float:
    try:
        return float(os.getenv(key, str(default)))
    except ValueError:
        return default


def env_int(key: str, default: int) -> int:
    try:
        return int(os.getenv(key, str(default)))
    except ValueError:
        return default
