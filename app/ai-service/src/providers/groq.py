from typing import ClassVar

import httpx

from providers.base import (
    ProviderConfigurationError,
    ProviderTimeoutError,
    Transcription,
    TranscriptionError,
    env_float,
    env_int,
    env_str,
)


class GroqTranscriber:
    """Groq Whisper speech-to-text adapter (default transcriber)."""

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

    def __init__(
        self, *, api_key: str | None = None, timeout_seconds: float | None = None
    ):
        self.api_key = api_key or env_str("GROQ_API_KEY")
        self.endpoint = env_str("GROQ_ENDPOINT")
        self.model = env_str("GROQ_MODEL", "whisper-large-v3-turbo")
        self.timeout_seconds = timeout_seconds or env_float(
            "GROQ_TIMEOUT_SECONDS", 60.0
        )
        self.max_upload_bytes = env_int("MAX_AUDIO_UPLOAD_BYTES", 10 * 1024 * 1024)

    async def transcribe(
        self, audio: bytes, filename: str = "check-in.wav"
    ) -> Transcription:
        if not self.api_key:
            raise ProviderConfigurationError("GROQ_API_KEY is not configured.")
        if not self.endpoint:
            raise ProviderConfigurationError("GROQ_ENDPOINT is not configured.")
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
