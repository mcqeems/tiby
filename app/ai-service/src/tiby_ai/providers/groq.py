from dataclasses import dataclass
import os

import httpx


class SpeechToTextError(RuntimeError):
    pass


@dataclass(frozen=True)
class Transcription:
    text: str
    provider: str
    model: str


class GroqTranscriber:
    endpoint = "https://api.groq.com/openai/v1/audio/transcriptions"
    model = "whisper-large-v3-turbo"
    max_upload_bytes = 20 * 1024 * 1024
    supported_content_types = {
        "audio/wav",
        "audio/x-wav",
        "audio/mpeg",
        "audio/mp4",
        "audio/x-m4a",
        "audio/ogg",
        "audio/webm",
        "audio/flac",
        "audio/x-flac",
    }

    def __init__(self, *, api_key: str | None = None, timeout_seconds: float = 60.0):
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        self.timeout_seconds = timeout_seconds

    async def transcribe(self, audio: bytes, filename: str = "check-in.wav") -> Transcription:
        if not self.api_key:
            raise SpeechToTextError("GROQ_API_KEY is not configured.")
        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                response = await client.post(
                    self.endpoint,
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    data={"model": self.model, "language": "id", "response_format": "json"},
                    files={"file": (filename, audio)},
                )
                response.raise_for_status()
                transcript = response.json().get("text")
                if not isinstance(transcript, str) or not transcript.strip():
                    raise SpeechToTextError("Groq returned an empty transcript.")
                return Transcription(
                    text=transcript.strip(), provider="groq", model=self.model
                )
        except (httpx.HTTPError, ValueError) as exc:
            raise SpeechToTextError("Groq transcription failed.") from exc
