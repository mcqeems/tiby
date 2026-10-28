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


class FishAudioTranscriber:
    """Fish Audio speech-to-text adapter (opt-in via TIBY_TRANSCRIBER=fish)."""

    max_upload_bytes = 10 * 1024 * 1024

    supported_content_types: ClassVar[set[str]] = {
        "audio/wav",
        "video/wav",
        "video/webm",
        "audio/mp3",
        "video/mp3",
        "audio/mpeg",
        "video/mpeg",
        "audio/webm",
        "audio/ogg",
        "video/ogg",
    }

    def __init__(
        self, *, api_token: str | None = None, timeout_seconds: float | None = None
    ):
        self.api_token = (
            api_token or env_str("FISH_AUDIO_API_TOKEN") or env_str("FISH_API_KEY")
        )
        self.endpoint = env_str("FISH_ENDPOINT")
        self.model = env_str("FISH_MODEL", "transcribe-1-pro")
        self.timeout_seconds = timeout_seconds or env_float(
            "FISH_TIMEOUT_SECONDS", 60.0
        )
        self.max_upload_bytes = env_int(
            "MAX_AUDIO_UPLOAD_BYTES", type(self).max_upload_bytes
        )

    async def transcribe(
        self, audio: bytes, filename: str = "check-in.wav"
    ) -> Transcription:
        if not self.api_token:
            raise ProviderConfigurationError("FISH_AUDIO_API_TOKEN is not configured.")
        if not self.endpoint:
            raise ProviderConfigurationError("FISH_ENDPOINT is not configured.")
        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                response = await client.post(
                    self.endpoint,
                    headers={
                        "Authorization": f"Bearer {self.api_token}",
                        "model": self.model,
                    },
                    files={"audio": (filename, audio)},
                    data={"ignore_timestamps": "true", "language": "id"},
                )
                response.raise_for_status()
                transcript = response.json().get("text")
                if not isinstance(transcript, str) or not transcript.strip():
                    raise TranscriptionError("Fish Audio returned an empty transcript.")
                return Transcription(
                    text=transcript.strip(), provider="fish", model=self.model
                )
        except httpx.TimeoutException as exc:
            raise ProviderTimeoutError("Fish Audio transcription timed out.") from exc
        except (httpx.HTTPError, ValueError) as exc:
            raise TranscriptionError("Fish Audio transcription failed.") from exc
