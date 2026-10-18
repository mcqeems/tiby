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
from fastapi.routing import APIRoute
from pydantic import BaseModel

from tiby_ai.contracts import CheckInRequest, GuidanceRequest
from tiby_ai.main import app

COLLECTION_ROOT = Path(__file__).resolve().parents[3] / "shared" / "api-contract" / "AI"
COMMENT_LINE = re.compile(r"^\s*//.*$", re.MULTILINE)

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
    return request["http"]["method"].upper(), request["http"]["url"].removeprefix("{{baseUrl}}")


def app_routes() -> set[tuple[str, str]]:
    return {
        (method, route.path)
        for route in app.routes
        if isinstance(route, APIRoute) and route.include_in_schema
        for method in route.methods or set()
    }


def test_collection_covers_exactly_the_app_routes():
    assert {route_of(request) for request in collection_requests()} == app_routes()


def test_collection_urls_stay_under_the_ai_prefix():
    for request in collection_requests():
        assert request["http"]["url"].startswith("{{baseUrl}}/ai/"), request["file"]


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
