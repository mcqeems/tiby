import os
from typing import ClassVar

import httpx

from .base import (
    ProviderConfigurationError,
    ProviderTimeoutError,
    Transcription,
    TranscriptionError,
)


class GroqTranscriber:
    """Groq Whisper speech-to-text adapter (default transcriber).

    Upload limits and accepted content types are part of the ``Transcriber``
    protocol so the HTTP layer can enforce them before calling the provider.
    """

    endpoint = "https://api.groq.com/openai/v1/audio/transcriptions"
    model = "whisper-large-v3-turbo"
    # Keep the service upload boundary compatible with the backend.
    max_upload_bytes = 10 * 1024 * 1024
    supported_content_types: ClassVar[set[str]] = {
        "audio/wav",
        "video/wav",
        "video/webm",
        "audio/mp3",
        "video/mp3",
        "audio/mpeg",
        "video/mpeg",
        "audio/ogg",
        "video/ogg",
        "audio/webm",
    }

    def __init__(self, *, api_key: str | None = None, timeout_seconds: float = 60.0):
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        self.timeout_seconds = timeout_seconds

    async def transcribe(
        self, audio: bytes, filename: str = "check-in.wav"
    ) -> Transcription:
        """Transcribe raw audio bytes; raises ProviderConfigurationError without a key."""
        if not self.api_key:
            raise ProviderConfigurationError("GROQ_API_KEY is not configured.")
        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                response = await client.post(
                    self.endpoint,
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    data={
                        "model": self.model,
                        "language": "id",
                        "response_format": "json",
                    },
                    files={"file": (filename, audio)},
                )
                response.raise_for_status()
                transcript = response.json().get("text")
                if not isinstance(transcript, str) or not transcript.strip():
                    raise TranscriptionError("Groq returned an empty transcript.")
                return Transcription(
                    text=transcript.strip(), provider="groq", model=self.model
                )
        except httpx.TimeoutException as exc:
            raise ProviderTimeoutError("Groq transcription timed out.") from exc
        except (httpx.HTTPError, ValueError) as exc:
            raise TranscriptionError("Groq transcription failed.") from exc
