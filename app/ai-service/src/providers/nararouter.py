import json
from dataclasses import dataclass

import httpx

from contracts import CheckInRequest, CheckInResponse
from extraction.prompts import CHECKIN_EXTRACTION_SYSTEM, render_checkin_user_prompt
from providers.base import (
    ProviderConfigurationError,
    ProviderError,
    ProviderTimeoutError,
    env_float,
    env_str,
)

DEFAULT_MODEL = "laguna-s-2.1"


@dataclass(frozen=True)
class NaraRouterSettings:
    api_key: str
    base_url: str
    model: str = DEFAULT_MODEL
    timeout_seconds: float = 90.0

    @classmethod
    def from_env(cls) -> "NaraRouterSettings":
        return cls(
            api_key=env_str("NARAROUTER_API_TOKEN") or env_str("NARAROUTER_API_KEY"),
            base_url=env_str("NARAROUTER_BASE_URL").rstrip("/"),
            model=env_str("TIBY_LLM_MODEL", DEFAULT_MODEL),
            timeout_seconds=env_float("NARAROUTER_TIMEOUT_SECONDS", 90.0),
        )


class NaraRouterClient:
    """Fail-fast JSON chat-completions client; validation stays with the caller."""

    def __init__(self, settings: NaraRouterSettings | None = None):
        self.settings = settings or NaraRouterSettings.from_env()
        if not self.settings.api_key or not self.settings.base_url:
            raise ProviderConfigurationError(
                "Set NARAROUTER_API_TOKEN (or NARAROUTER_API_KEY) and NARAROUTER_BASE_URL."
            )

    async def chat_json(self, system: str, user: str) -> dict:
        """Return the parsed JSON object from a deterministic (temperature 0) completion."""
        payload = {
            "model": self.settings.model,
            "temperature": 0,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        }
        try:
            async with httpx.AsyncClient(
                timeout=self.settings.timeout_seconds
            ) as client:
                response = await client.post(
                    f"{self.settings.base_url}/chat/completions",
                    headers={"Authorization": f"Bearer {self.settings.api_key}"},
                    json=payload,
                )
                response.raise_for_status()
                content = response.json()["choices"][0]["message"]["content"]
                if isinstance(content, list):
                    content = "".join(
                        part.get("text", "")
                        for part in content
                        if isinstance(part, dict)
                    )
                parsed = json.loads(content)
                if not isinstance(parsed, dict):
                    raise TypeError("Provider returned JSON that is not an object.")
                return parsed
        except httpx.TimeoutException as exc:
            raise ProviderTimeoutError(
                "The language model provider timed out."
            ) from exc
        except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError) as exc:
            raise ProviderError(
                "The language model provider failed or returned an invalid response."
            ) from exc


class NaraRouterExtractor:
    """Check-in fact extraction through the NaraRouter chat-completions API.

    Named after the provider, not the model: ``TIBY_LLM_MODEL`` picks the model
    (``laguna-s-2.1`` by default) and can change without touching this class.
    """

    def __init__(self, client: NaraRouterClient | None = None):
        self.client = client or NaraRouterClient()

    async def extract(self, request: CheckInRequest) -> CheckInResponse:
        """Extract facts; provider output is schema-validated, deviations raise ProviderError."""
        provider_result = await self.client.chat_json(
            CHECKIN_EXTRACTION_SYSTEM, render_checkin_user_prompt(request.transcript)
        )
        try:
            return CheckInResponse.model_validate(provider_result)
        except ValueError as exc:
            raise ProviderError(
                "The extraction provider returned an invalid check-in payload."
            ) from exc
