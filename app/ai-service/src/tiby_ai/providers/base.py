"""Provider-facing types shared by the HTTP layer.

Protocols describe what the service needs from providers; the error taxonomy
lets the routes map failures onto contract status codes — 503 not configured,
504 timeout, 502 everything else — while providers stay free of HTTP concerns.
"""

from dataclasses import dataclass
from typing import ClassVar, Protocol

from ..contracts import CheckInRequest, CheckInResponse


class CheckInExtractor(Protocol):
    """Anything that turns a check-in request into extracted facts."""

    async def extract(self, request: CheckInRequest) -> CheckInResponse: ...


@dataclass(frozen=True)
class Transcription:
    """Result of one speech-to-text run, with the provider that produced it."""

    text: str
    provider: str
    model: str


class Transcriber(Protocol):
    """Speech-to-text adapter contract.

    Implementations expose their accepted upload limits and raise:
    - ProviderConfigurationError when credentials are missing;
    - ProviderTimeoutError when the upstream call times out;
    - TranscriptionError for any other provider failure.
    """

    supported_content_types: ClassVar[set[str]]
    max_upload_bytes: int

    async def transcribe(
        self, audio: bytes, filename: str = "check-in.wav"
    ) -> Transcription: ...


class ProviderConfigurationError(RuntimeError):
    pass


class ProviderError(RuntimeError):
    pass


class ProviderTimeoutError(ProviderError):
    pass


class TranscriptionError(ProviderError):
    pass
