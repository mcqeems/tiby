"""Minimal OpenAI-compatible chat-completions client shared by LLM call sites."""

import json
import os
from dataclasses import dataclass

import httpx

from .base import ProviderConfigurationError, ProviderError, ProviderTimeoutError

DEFAULT_MODEL = "agnes-2.5-flash"


@dataclass(frozen=True)
class NaraRouterSettings:
    api_key: str
    base_url: str
    model: str = DEFAULT_MODEL
    timeout_seconds: float = 90.0

    @classmethod
    def from_env(cls) -> "NaraRouterSettings":
        return cls(
            api_key=os.getenv("NARAROUTER_API_TOKEN") or os.getenv("NARAROUTER_API_KEY") or "",
            base_url=os.getenv("NARAROUTER_BASE_URL", "").rstrip("/"),
            model=os.getenv("TIBY_LLM_MODEL", DEFAULT_MODEL),
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
            async with httpx.AsyncClient(timeout=self.settings.timeout_seconds) as client:
                response = await client.post(
                    f"{self.settings.base_url}/chat/completions",
                    headers={"Authorization": f"Bearer {self.settings.api_key}"},
                    json=payload,
                )
                response.raise_for_status()
                content = response.json()["choices"][0]["message"]["content"]
                if isinstance(content, list):
                    content = "".join(part.get("text", "") for part in content if isinstance(part, dict))
                parsed = json.loads(content)
                if not isinstance(parsed, dict):
                    raise TypeError("Provider returned JSON that is not an object.")
                return parsed
        except httpx.TimeoutException as exc:
            raise ProviderTimeoutError("The language model provider timed out.") from exc
        except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError) as exc:
            raise ProviderError("The language model provider failed or returned an invalid response.") from exc
