"""Keep the OpenCollection contract in ``shared/api-contract`` in sync with the code.

The collection (Bruno/OpenCollection format) is the team's source of truth for
the AI-service HTTP contract; only its ``AI/`` folder is validated here —
``Backend/`` targets the backend service, not this app. These tests fail when
routes or request bodies drift apart: every collection request must exist in
the app with the same method, every app route must be covered, all URLs must
stay under the ``/ai`` prefix, every request must be documented and carry at
least one saved example,
and each JSON body must parse — with ``//`` comment lines stripped, so keep
body comments on their own lines — and validate against the Pydantic models.
"""

import json
import re
from pathlib import Path

import yaml
from pydantic import BaseModel

from contracts import CheckInRequest, GuidanceRequest
from main import app

COLLECTION_ROOT = Path(__file__).resolve().parents[3] / "shared" / "api-contract" / "AI"
COMMENT_LINE = re.compile(r"^\s*//.*$", re.MULTILINE)
# The collection is shared with the frontend and backend, so AI requests may use
# either the plain ``baseUrl`` or the AI-specific ``aiBaseUrl`` variable.
BASE_URL_PREFIX = re.compile(r"^\{\{[^}]+\}\}")

BODY_MODELS: dict[str, type[BaseModel]] = {
    "/ai/extractions/check-in": CheckInRequest,
    "/ai/guidance": GuidanceRequest,
}


def collection_requests() -> list[dict]:
    """Load every request; collection config and environments have no ``http`` block."""
    requests = []
    for path in sorted(COLLECTION_ROOT.rglob("*.yml")):
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
        if isinstance(data, dict) and isinstance(data.get("http"), dict):
            requests.append({"file": path, **data})
    return requests


def route_of(request: dict) -> tuple[str, str]:
    return request["http"]["method"].upper(), BASE_URL_PREFIX.sub(
        "", request["http"]["url"]
    )


def app_routes() -> set[tuple[str, str]]:
    """Effective routes from the OpenAPI schema (FastAPI resolves included routers lazily)."""
    return {
        (method.upper(), path)
        for path, operations in app.openapi()["paths"].items()
        for method in operations
    }


def test_collection_covers_exactly_the_app_routes():
    assert {route_of(request) for request in collection_requests()} == app_routes()


def test_collection_urls_stay_under_the_ai_prefix():
    for request in collection_requests():
        url = request["http"]["url"]
        assert BASE_URL_PREFIX.match(url), request["file"]
        assert route_of(request)[1].startswith("/ai/"), request["file"]


def test_multipart_routes_send_the_fields_the_app_requires():
    """A route that takes a file must ship a real multipart body.

    ``body: {type: file, data: [{filePath: ...}]}`` is not the collection
    schema: it sends no part at all, so the app answers 422 while the request
    looks configured. Multiline bodies here are ``multipart-form`` with one
    entry per part, named the way the app declares it.
    """
    schema = app.openapi()
    for request in collection_requests():
        method, path = route_of(request)
        content = (
            schema["paths"].get(path, {})
            .get(method.lower(), {})
            .get("requestBody", {})
            .get("content", {})
        )
        multipart = content.get("multipart/form-data")
        if multipart is None:
            continue
        body = request["http"].get("body") or {}
        assert body.get("type") == "multipart-form", request["file"]
        sent = {part.get("name") for part in body.get("data", [])}
        declared = multipart.get("schema", {})
        while "$ref" in declared:  # FastAPI emits a component ref, not the fields
            declared = schema["components"]["schemas"][declared["$ref"].rsplit("/", 1)[-1]]
        required = set(declared.get("required", []))
        assert required <= sent, f"{request['file']}: sends {sent}, needs {required}"


def test_collection_requests_have_docs_and_saved_examples():
    for request in collection_requests():
        assert request.get("docs"), request["file"]
        assert request.get("examples"), request["file"]


def test_collection_saved_examples_are_well_formed():
    for request in collection_requests():
        for example in request.get("examples", []):
            assert example.get("name"), request["file"]
            response = example.get("response", {})
            assert isinstance(response.get("status"), int), request["file"]
            body = response.get("body", {})
            assert body.get("type") == "json", request["file"]
            assert isinstance(body.get("data"), str) and body["data"], request["file"]


def test_collection_json_bodies_match_the_request_models():
    for request in collection_requests():
        model = BODY_MODELS.get(route_of(request)[1])
        if model is None:
            continue
        body = request["http"]["body"]
        assert body["type"] == "json", request["file"]
        payload = json.loads(COMMENT_LINE.sub("", body["data"]))
        model.model_validate(payload)
