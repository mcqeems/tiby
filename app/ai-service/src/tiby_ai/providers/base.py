from dataclasses import dataclass
from typing import Protocol

from ..contracts import CheckInRequest, CheckInResponse


class CheckInExtractor(Protocol):
    async def extract(self, request: CheckInRequest) -> CheckInResponse: ...


@dataclass(frozen=True)
class ProviderSettings:
    api_key: str
    base_url: str
    model: str = "agnes-2.5-flash"
    timeout_seconds: float = 30.0


class ProviderConfigurationError(RuntimeError):
    pass


class ProviderError(RuntimeError):
    pass
