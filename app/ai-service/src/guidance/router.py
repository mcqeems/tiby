"""HTTP routes for grounded guidance answers.

Thin layer: retrieve evidence, delegate to the answerer, map provider
errors to ``ApiError`` or a fail-closed response.
"""

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from contracts import GuidanceRequest, GuidanceResponse
from errors import GUIDANCE_ERRORS, api_error
from guidance.retrieval import SQLiteRetriever
from guidance.service import GroundedAnswerer, pack_evidence
from providers.base import ProviderConfigurationError, ProviderError

router = APIRouter(tags=["guidance"])


@router.post(
    "/ai/guidance",
    response_model=GuidanceResponse,
    responses=GUIDANCE_ERRORS,
)
async def guidance_endpoint(
    payload: GuidanceRequest,
    request: Request,
) -> GuidanceResponse | JSONResponse:
    """Answer a general educational question from approved-source evidence.

    Fails closed (``answer: null``) when no evidence matches or when the local
    guard detects a personal decision request such as dosing or start/stop
    questions; citations are allowlisted against the retrieved evidence.
    """
    retriever = getattr(request.app.state, "guidance_retriever", None)
    if retriever is None:
        retriever = request.app.state.guidance_retriever = SQLiteRetriever()
    question = payload.question
    if payload.transcript:
        question = f"{payload.question} {payload.transcript}"
    evidence = retriever.search(question, limit=4)
    if not evidence:
        return GuidanceResponse(
            answer=None,
            grounded=False,
            limitations=[
                "Belum ada evidence yang cocok dari dokumen rujukan resmi.",
                "Informasi ini bukan diagnosis atau instruksi pengobatan.",
            ],
        )
    try:
        if getattr(request.app.state, "guidance_answerer", None) is None:
            request.app.state.guidance_answerer = GroundedAnswerer()
        return await request.app.state.guidance_answerer.answer(
            payload.question, payload.transcript, pack_evidence(evidence)
        )
    except ProviderConfigurationError as exc:
        return api_error(503, "INTERNAL", str(exc))
    except ProviderError as exc:
        return GuidanceResponse(answer=None, grounded=False, limitations=[str(exc)])
