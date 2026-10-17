from ..contracts import CheckInRequest, CheckInResponse
from ..prompts import CHECKIN_EXTRACTION_SYSTEM, checkin_extraction_user
from .base import ProviderError
from .nararouter import NaraRouterClient


class AgnesExtractor:
    """Check-in fact extraction through the NaraRouter chat-completions API."""

    def __init__(self, client: NaraRouterClient | None = None):
        self.client = client or NaraRouterClient()

    async def extract(self, request: CheckInRequest) -> CheckInResponse:
        """Extract facts; provider output is schema-validated, deviations raise ProviderError."""
        provider_result = await self.client.chat_json(
            CHECKIN_EXTRACTION_SYSTEM, checkin_extraction_user(request.transcript)
        )
        try:
            return CheckInResponse.model_validate(provider_result)
        except ValueError as exc:
            raise ProviderError("The extraction provider returned an invalid check-in payload.") from exc
