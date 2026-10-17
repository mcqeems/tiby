import asyncio
import json
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from fastapi.testclient import TestClient

from tiby_ai.contracts import CheckInRequest, CheckInResponse, GuidanceResponse
from tiby_ai.guidance.service import GroundedAnswerer
from tiby_ai.main import app, extraction_service, transcription_service, RuleBasedExtractor
from tiby_ai.providers.agnes import AgnesExtractor
from tiby_ai.providers.base import ProviderError, ProviderTimeoutError, Transcription
from tiby_ai.providers.fish import FishAudioTranscriber
from tiby_ai.providers.groq import GroqTranscriber
from tiby_ai.providers.nararouter import NaraRouterClient, NaraRouterSettings
from tiby_ai.guidance.retrieval import Citation, Evidence


client = TestClient(app)


def response_payload():
    return {
        "schema_version": "1.0",
        "extraction": {
            "medication": {"taken": True, "dose_count": 4},
            "symptoms": [],
            "possible_red_flags": [],
            "intent_to_stop": False,
        },
        "confidence": 0.9,
        "uncertainties": [],
    }


def router_client(**overrides) -> NaraRouterClient:
    defaults = {"api_key": "test-token", "base_url": "https://router.test/v1"}
    return NaraRouterClient(NaraRouterSettings(**{**defaults, **overrides}))


def test_health():
    response = client.get("/ai/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_service_factories_switch_on_env(monkeypatch):
    monkeypatch.setenv("TIBY_EXTRACTOR", "rules")
    assert isinstance(extraction_service(), RuleBasedExtractor)
    monkeypatch.delenv("TIBY_TRANSCRIBER", raising=False)
    assert isinstance(transcription_service(), GroqTranscriber)
    monkeypatch.setenv("TIBY_TRANSCRIBER", "fish")
    assert isinstance(transcription_service(), FishAudioTranscriber)


def test_check_in_extracts_facts_in_rules_mode(monkeypatch):
    monkeypatch.setenv("TIBY_EXTRACTOR", "rules")
    response = client.post(
        "/ai/extractions/check-in",
        json={"transcript": "Sudah minum obat empat biji. Mual dari siang."},
    )
    assert response.status_code == 200
    assert response.json()["extraction"]["medication"] == {"taken": True, "dose_count": 4}
    assert response.json()["extraction"]["symptoms"][0]["name"] == "mual"


def test_check_in_rejects_invalid_request(monkeypatch):
    monkeypatch.setenv("TIBY_EXTRACTOR", "rules")
    response = client.post("/ai/extractions/check-in", json={"transcript": ""})
    assert response.status_code == 422
    assert response.json()["code"] == "INVALID_REQUEST"


def test_check_in_rejects_decision_fields(monkeypatch):
    monkeypatch.setenv("TIBY_EXTRACTOR", "rules")
    response = client.post(
        "/ai/extractions/check-in",
        json={"transcript": "Sudah minum obat.", "risk_status": "controlled"},
    )
    assert response.status_code == 422


def test_check_in_timeout_maps_to_provider_timeout(monkeypatch):
    monkeypatch.setenv("NARAROUTER_API_TOKEN", "test-router-token")
    monkeypatch.setenv("NARAROUTER_BASE_URL", "https://router.test/v1")
    with patch.object(
        AgnesExtractor, "extract", new=AsyncMock(side_effect=ProviderTimeoutError("timed out"))
    ):
        response = client.post("/ai/extractions/check-in", json={"transcript": "Sudah minum obat."})
    assert response.status_code == 504
    assert response.json()["code"] == "PROVIDER_TIMEOUT"


def test_audio_endpoint_connects_transcriber_and_extractor(monkeypatch):
    monkeypatch.setenv("NARAROUTER_API_TOKEN", "test-router-token")
    monkeypatch.setenv("NARAROUTER_BASE_URL", "https://router.test/v1")
    fake_result = CheckInResponse.model_validate(response_payload())
    with patch.object(
        GroqTranscriber,
        "transcribe",
        new=AsyncMock(return_value=Transcription("Sudah minum obat empat biji.", "groq", "whisper-large-v3-turbo")),
    ) as transcribe, patch.object(
        AgnesExtractor, "extract", new=AsyncMock(return_value=fake_result)
    ) as extract:
        response = client.post(
            "/ai/extractions/check-in/audio",
            files={"audio": ("speech.wav", b"fake-wav", "audio/wav")},
        )
    assert response.status_code == 200
    assert response.json()["transcript"] == "Sudah minum obat empat biji."
    assert response.json()["transcription_provider"] == "groq"
    assert response.json()["transcription_model"] == "whisper-large-v3-turbo"
    assert response.json()["extraction"]["medication"]["dose_count"] == 4
    transcribe.assert_awaited_once()
    extract.assert_awaited_once()


def test_audio_endpoint_rejects_non_audio_upload():
    response = client.post(
        "/ai/extractions/check-in/audio",
        files={"audio": ("note.txt", b"not audio", "text/plain")},
    )
    assert response.status_code == 415
    assert response.json()["code"] == "INVALID_REQUEST"


def test_audio_endpoint_rejects_oversized_upload(monkeypatch):
    monkeypatch.setattr(GroqTranscriber, "max_upload_bytes", 4)
    response = client.post(
        "/ai/extractions/check-in/audio",
        files={"audio": ("speech.wav", b"12345", "audio/wav")},
    )
    assert response.status_code == 413
    assert response.json()["code"] == "INVALID_REQUEST"


def test_audio_endpoint_rejects_transcription_over_contract_limit():
    long_text = "mual " * 1500
    with patch.object(
        GroqTranscriber,
        "transcribe",
        new=AsyncMock(return_value=Transcription(long_text, "groq", "whisper-large-v3-turbo")),
    ):
        response = client.post(
            "/ai/extractions/check-in/audio",
            files={"audio": ("speech.wav", b"fake-wav", "audio/wav")},
        )
    assert response.status_code == 422
    assert response.json()["code"] == "INVALID_REQUEST"


def test_audio_endpoint_maps_transcription_timeout(monkeypatch):
    with patch.object(
        GroqTranscriber, "transcribe", new=AsyncMock(side_effect=ProviderTimeoutError("timed out"))
    ):
        response = client.post(
            "/ai/extractions/check-in/audio",
            files={"audio": ("speech.wav", b"fake-wav", "audio/wav")},
        )
    assert response.status_code == 504
    assert response.json()["code"] == "PROVIDER_TIMEOUT"


def test_guidance_endpoint_returns_null_without_evidence():
    with patch("tiby_ai.main.SQLiteRetriever") as retriever_cls:
        retriever_cls.return_value.search.return_value = []
        response = client.post("/ai/guidance", json={"question": "Topik yang tidak ada di indeks."})
    assert response.status_code == 200
    assert response.json()["answer"] is None
    assert response.json()["grounded"] is False
    assert response.json()["limitations"]


def test_guidance_endpoint_packs_evidence_for_answerer():
    evidence = [
        Evidence(
            Citation("chunk-1", "who-demo", "WHO", "Demo guidance", 2025, 7, None, "https://who.int"),
            "Adherence support text.",
        )
    ]
    expected = GuidanceResponse(answer="ok", grounded=False, limitations=[])
    with patch("tiby_ai.main.SQLiteRetriever") as retriever_cls, patch(
        "tiby_ai.main.GroundedAnswerer"
    ) as answerer_cls:
        retriever_cls.return_value.search.return_value = evidence
        answerer_cls.return_value.answer = AsyncMock(return_value=expected)
        response = client.post("/ai/guidance", json={"question": "Apa itu TB?"})
    assert response.status_code == 200
    assert response.json()["answer"] == "ok"
    question, transcript, packed = answerer_cls.return_value.answer.await_args.args
    assert question == "Apa itu TB?"
    assert transcript is None
    assert packed == [
        {
            "citation": {
                "citation_id": "src-1",
                "document_id": "who-demo",
                "organization": "WHO",
                "title": "Demo guidance",
                "year": 2025,
                "page": 7,
                "section": None,
                "source_url": "https://who.int",
            },
            "text": "Adherence support text.",
        }
    ]


def test_guidance_validation_uses_error_envelope():
    response = client.post("/ai/guidance", json={})
    assert response.status_code == 422
    assert response.json()["code"] == "INVALID_REQUEST"


def test_agnes_provider_builds_configured_request_and_validates_response():
    seen = {}

    def handler(request):
        seen["url"] = str(request.url)
        seen["authorization"] = request.headers.get("authorization")
        seen["body"] = json.loads(request.content)
        return httpx.Response(
            200,
            json={"choices": [{"message": {"content": json.dumps(response_payload())}}]},
        )

    real_client = httpx.AsyncClient

    async def run_test():
        transport = httpx.MockTransport(handler)
        with patch(
            "tiby_ai.providers.nararouter.httpx.AsyncClient",
            side_effect=lambda **kwargs: real_client(transport=transport, **kwargs),
        ):
            extractor = AgnesExtractor(router_client(model="agnes-2.5-flash"))
            result = await extractor.extract(
                CheckInRequest(transcript="Sudah minum obat empat biji.")
            )
        assert result.extraction.medication.dose_count == 4

    asyncio.run(run_test())
    assert seen["url"] == "https://router.test/v1/chat/completions"
    assert seen["authorization"] == "Bearer test-token"
    assert seen["body"]["model"] == "agnes-2.5-flash"
    assert seen["body"]["response_format"] == {"type": "json_object"}
    assert "Do not diagnose" in seen["body"]["messages"][0]["content"]


def test_agnes_provider_rejects_unexpected_risk_decision():
    invalid = response_payload()
    invalid["extraction"]["risk_status"] = "controlled"
    transport = httpx.MockTransport(
        lambda _: httpx.Response(
            200,
            json={"choices": [{"message": {"content": json.dumps(invalid)}}]},
        )
    )
    real_client = httpx.AsyncClient

    async def run_test():
        with patch(
            "tiby_ai.providers.nararouter.httpx.AsyncClient",
            side_effect=lambda **kwargs: real_client(transport=transport, **kwargs),
        ):
            extractor = AgnesExtractor(router_client())
            with pytest.raises(ProviderError):
                await extractor.extract(CheckInRequest(transcript="Sudah minum obat."))

    asyncio.run(run_test())


def test_nararouter_timeout_maps_to_provider_timeout():
    def handler(request):
        raise httpx.TimeoutException("timed out")

    real_client = httpx.AsyncClient

    async def run_test():
        transport = httpx.MockTransport(handler)
        with patch(
            "tiby_ai.providers.nararouter.httpx.AsyncClient",
            side_effect=lambda **kwargs: real_client(transport=transport, **kwargs),
        ):
            with pytest.raises(ProviderTimeoutError):
                await router_client().chat_json("system", "user")

    asyncio.run(run_test())


def test_groq_provider_uses_configured_token_and_returns_transcript():
    seen = {}

    def handler(request):
        seen["authorization"] = request.headers["Authorization"]
        seen["path"] = request.url.path
        body = request.content.decode("latin1")
        assert "whisper-large-v3-turbo" in body
        assert 'name="language"' in body
        assert "id" in body
        return httpx.Response(200, json={"text": "Sudah minum obat."})

    real_client = httpx.AsyncClient

    async def run_test():
        transport = httpx.MockTransport(handler)
        with patch(
            "tiby_ai.providers.groq.httpx.AsyncClient",
            side_effect=lambda **kwargs: real_client(transport=transport, **kwargs),
        ):
            return await GroqTranscriber(api_key="groq-test-token").transcribe(b"wav-bytes")

    result = asyncio.run(run_test())
    assert result.text == "Sudah minum obat."
    assert result.provider == "groq"
    assert result.model == "whisper-large-v3-turbo"
    assert seen["authorization"] == "Bearer groq-test-token"
    assert seen["path"] == "/openai/v1/audio/transcriptions"


def test_guidance_action_request_fails_closed_without_provider_call(monkeypatch):
    monkeypatch.setenv("NARAROUTER_API_TOKEN", "dummy")
    monkeypatch.setenv("NARAROUTER_BASE_URL", "https://router.test/v1")
    with patch("tiby_ai.providers.nararouter.httpx.AsyncClient") as client_factory:
        result = asyncio.run(
            GroundedAnswerer().answer(
                "Saya mual. Haruskah saya berhenti minum obat?", None, []
            )
        )
    assert result.answer is None
    assert result.grounded is False
    assert "tenaga kesehatan" in result.limitations[0]
    client_factory.assert_not_called()


def test_guidance_action_request_in_transcript_also_fails_closed(monkeypatch):
    monkeypatch.setenv("NARAROUTER_API_TOKEN", "dummy")
    monkeypatch.setenv("NARAROUTER_BASE_URL", "https://router.test/v1")
    with patch("tiby_ai.providers.nararouter.httpx.AsyncClient") as client_factory:
        result = asyncio.run(
            GroundedAnswerer().answer(
                "Apa itu tuberkulosis?",
                "Saya mual. Haruskah saya berhenti minum obat TB saya?",
                [],
            )
        )
    assert result.answer is None
    assert result.grounded is False
    client_factory.assert_not_called()


def test_guidance_general_question_can_continue_to_grounded_answerer(monkeypatch):
    monkeypatch.setenv("NARAROUTER_API_TOKEN", "dummy")
    monkeypatch.setenv("NARAROUTER_BASE_URL", "https://router.test/v1")
    assert GroundedAnswerer().client.settings.api_key == "dummy"


def test_prompt_defines_strict_fact_only_boundaries():
    from tiby_ai.prompts import CHECKIN_EXTRACTION_SYSTEM

    assert "intent to stop taking the medication only" in CHECKIN_EXTRACTION_SYSTEM
    assert "return []" in CHECKIN_EXTRACTION_SYSTEM
    assert "Set severity to unknown unless the speaker explicitly qualifies it" in CHECKIN_EXTRACTION_SYSTEM
    assert "null" in CHECKIN_EXTRACTION_SYSTEM


def test_prompt_keeps_ambiguous_transcript_as_quoted_data():
    from tiby_ai.prompts import checkin_extraction_user

    prompt = checkin_extraction_user("lupa {json} dan belum minum")
    assert '"lupa {json} dan belum minum"' in prompt
    assert "{transcript}" not in prompt
