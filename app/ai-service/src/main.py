"""HTTP surface of the AI service.

Mounts the per-domain routers; all error envelopes and OpenAPI error
documentation live in :mod:`errors`. Dependency wiring (retriever
lifespan) stays here because it is app-scoped, not route-scoped.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from env import load_env
from errors import AppException, api_error
from extraction.router import router as extraction_router
from guidance.retrieval import SQLiteRetriever
from guidance.router import router as guidance_router
from onboarding_ocr.router import router as onboarding_ocr_router

load_env()


@asynccontextmanager
async def lifespan(application: FastAPI):
    """Reuse the stateless retriever and lazily initialize provider-backed answerer."""
    application.state.guidance_retriever = SQLiteRetriever()
    application.state.guidance_answerer = None
    yield


app = FastAPI(
    title="Tiby AI Extraction API",
    version="1.0.0",
    description="Extracts reported facts from check-in text; does not diagnose or assign risk.",
    lifespan=lifespan,
)


# Routers
app.include_router(onboarding_ocr_router)
app.include_router(extraction_router)
app.include_router(guidance_router)


# Exception handlers
@app.exception_handler(RequestValidationError)
async def request_validation_handler(
    _: Request, __: RequestValidationError
) -> JSONResponse:
    """Wrap FastAPI's built-in request validation errors in ``ApiError``."""
    return api_error(422, "INVALID_REQUEST", "Request does not match the API contract.")


@app.exception_handler(AppException)
async def app_exception_handler(_: Request, exc: AppException) -> JSONResponse:
    """Render every ``AppException`` using the shared ``ApiError`` envelope."""
    return api_error(exc.status_code, exc.code, exc.message)


# Health
@app.get("/ai/health", tags=["health"])
def health() -> dict[str, str]:
    """Liveness probe for orchestrators and dev scripts."""
    return {"status": "ok"}
