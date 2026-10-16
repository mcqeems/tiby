import json
import os

import httpx

from ..contracts import CheckInRequest, CheckInResponse
from ..prompts import CHECKIN_EXTRACTION_SYSTEM, checkin_extraction_user
from .base import ProviderConfigurationError, ProviderError


class AgnesExtractor:
    def __init__(self, *, api_key: str | None = None, base_url: str | None = None, model: str | None = None):
        self.api_key = api_key or os.getenv("NARAROUTER_API_TOKEN") or os.getenv("NARAROUTER_API_KEY")
        self.base_url = (base_url or os.getenv("NARAROUTER_BASE_URL", "")).rstrip("/")
        self.model = model or os.getenv("TIBY_LLM_MODEL", "agnes-2.5-flash")
        if not self.api_key or not self.base_url:
            raise ProviderConfigurationError(
                "Set NARAROUTER_API_TOKEN (or NARAROUTER_API_KEY) and NARAROUTER_BASE_URL for Agnes extraction."
            )

    async def extract(self, request: CheckInRequest) -> CheckInResponse:
        payload = {
            "model": self.model,
            "temperature": 0,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": CHECKIN_EXTRACTION_SYSTEM},
                {"role": "user", "content": checkin_extraction_user(request.transcript)},
            ],
        }
        try:
            async with httpx.AsyncClient(timeout=90) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    json=payload,
                )
                response.raise_for_status()
                content = response.json()["choices"][0]["message"]["content"]
                if isinstance(content, list):
                    content = "".join(part.get("text", "") for part in content if isinstance(part, dict))
                parsed = json.loads(content)
                return CheckInResponse.model_validate(parsed)
        except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError) as exc:
            raise ProviderError("The extraction provider failed or returned an invalid response.") from exc
