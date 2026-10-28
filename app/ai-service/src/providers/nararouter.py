import json
from dataclasses import dataclass

import httpx

from providers.base import (
    ProviderConfigurationError,
    ProviderError,
    ProviderTimeoutError,
    env_float,
    env_str,
)

DEFAULT_MODEL = "agnes-2.5-flash"


@dataclass(frozen=True)
class NaraRouterSettings:
    api_key: str
    endpoint: str
    model: str = DEFAULT_MODEL
    timeout_seconds: float = 90.0

    @classmethod
    def from_env(cls) -> "NaraRouterSettings":
        return cls(
            api_key=env_str("NARAROUTER_API_TOKEN") or env_str("NARAROUTER_API_KEY"),
            endpoint=env_str("NARAROUTER_ENDPOINT"),
            model=env_str("NARAROUTER_MODEL", DEFAULT_MODEL),
            timeout_seconds=env_float("NARAROUTER_TIMEOUT_SECONDS", 90.0),
        )


class NaraRouterClient:
    """Fail-fast JSON chat-completions client; validation stays with the caller."""

    def __init__(self, settings: NaraRouterSettings | None = None):
        self.settings = settings or NaraRouterSettings.from_env()
        if not self.settings.api_key or not self.settings.endpoint:
            raise ProviderConfigurationError(
                "Set NARAROUTER_API_TOKEN (or NARAROUTER_API_KEY) and NARAROUTER_ENDPOINT."
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
                    self.settings.endpoint,
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
