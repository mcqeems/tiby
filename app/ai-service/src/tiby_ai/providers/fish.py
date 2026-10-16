import os

import httpx


class FishAudioError(RuntimeError):
    pass


class FishAudioTranscriber:
    endpoint = "https://api.fish.audio/v1/asr"
    max_upload_bytes = 20 * 1024 * 1024
    supported_content_types = {
        "audio/wav",
        "audio/x-wav",
        "audio/mpeg",
        "audio/webm",
        "audio/ogg",
        "audio/mp4",
    }

    def __init__(self, *, api_token: str | None = None, timeout_seconds: float = 60.0):
        self.api_token = api_token or os.getenv("FISH_AUDIO_API_TOKEN") or os.getenv("FISH_API_KEY")
        self.timeout_seconds = timeout_seconds

    async def transcribe(self, audio: bytes, filename: str = "check-in.wav") -> str:
        if not self.api_token:
            raise FishAudioError("FISH_AUDIO_API_TOKEN is not configured.")
        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                response = await client.post(
                    self.endpoint,
                    headers={"Authorization": f"Bearer {self.api_token}", "model": "transcribe-1-pro"},
                    files={"audio": (filename, audio)},
                    data={"ignore_timestamps": "true", "language": "id"},
                )
                response.raise_for_status()
                transcript = response.json().get("text")
                if not isinstance(transcript, str) or not transcript.strip():
                    raise FishAudioError("Fish Audio returned an empty transcript.")
                return transcript.strip()
        except (httpx.HTTPError, ValueError) as exc:
            raise FishAudioError("Fish Audio transcription failed.") from exc
