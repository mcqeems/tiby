import asyncio
import json
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from fastapi.testclient import TestClient

from contracts import CheckInRequest, GuidanceResponse
from guidance.retrieval import Citation, Evidence
from guidance.service import GroundedAnswerer
from main import app
from providers.base import (
    ProviderConfigurationError,
    ProviderError,
    ProviderTimeoutError,
    Transcription,
)
from providers.factory import (
    RuleBasedExtractor,
    extraction_service,
    transcription_service,
)
from providers.fish import FishAudioTranscriber
from providers.groq import GroqTranscriber
from providers.nararouter import (
    NaraRouterClient,
    NaraRouterExtractor,
    NaraRouterSettings,
)

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


@pytest.mark.parametrize(
    "content_type",
    ["audio/wav", "audio/mp3", "audio/mpeg", "audio/ogg", "audio/webm", "video/webm"],
)
def test_audio_upload_mime_types_match_backend_contract(content_type):
    assert content_type in GroqTranscriber.supported_content_types
    assert content_type in FishAudioTranscriber.supported_content_types


def test_audio_upload_limit_matches_backend_contract():
    assert GroqTranscriber.max_upload_bytes == 10 * 1024 * 1024
    assert FishAudioTranscriber.max_upload_bytes == 10 * 1024 * 1024


def test_check_in_extracts_facts_in_rules_mode(monkeypatch):
    monkeypatch.setenv("TIBY_EXTRACTOR", "rules")
    response = client.post(
        "/ai/extractions/check-in",
        json={"transcript": "Sudah minum obat empat biji. Mual dari siang."},
    )
    assert response.status_code == 200
    assert response.json()["medicationTaken"] == "SUDAH_MINUM"
    assert response.json()["pillsTakenCount"] == 4
    assert "MUAL_RINGAN" in response.json()["symptoms"]


def test_text_extract_alias_uses_the_same_response_contract(monkeypatch):
    monkeypatch.setenv("TIBY_EXTRACTOR", "rules")
    response = client.post("/text/extract", json={"transcript": "Belum minum obat."})
    assert response.status_code == 200
    assert response.json()["medicationTaken"] == "BELUM_MINUM"
    assert set(response.json()) == {
        "transcript",
        "medicationTaken",
        "pillsTakenCount",
        "symptoms",
        "intentToStopOrRefuse",
        "extractionConfidence",
    }


def test_check_in_maps_unconfigured_provider_to_api_error(monkeypatch):
    with patch(
        "extraction.router.extraction_service",
        side_effect=ProviderConfigurationError("missing secret"),
    ):
        response = client.post(
            "/ai/extractions/check-in", json={"transcript": "Sudah minum."}
        )
    assert response.status_code == 503
    assert response.json() == {
        "code": "INTERNAL",
        "message": "missing secret",
        "request_id": None,
    }


def test_check_in_maps_provider_failure_to_api_error():
    with patch(
        "extraction.router.extraction_service",
        side_effect=ProviderError("provider failed"),
    ):
        response = client.post(
            "/ai/extractions/check-in", json={"transcript": "Sudah minum."}
        )
    assert response.status_code == 502
    assert response.json()["code"] == "EXTRACTION_FAILED"


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
    monkeypatch.setenv("TIBY_EXTRACTOR", "nararouter")
    monkeypatch.setenv("NARAROUTER_API_TOKEN", "test-router-token")
    monkeypatch.setenv("NARAROUTER_BASE_URL", "https://router.test/v1")
    with patch.object(
        NaraRouterExtractor,
        "extract",
        new=AsyncMock(side_effect=ProviderTimeoutError("timed out")),
    ):
        response = client.post(
            "/ai/extractions/check-in", json={"transcript": "Sudah minum obat."}
        )
    assert response.status_code == 504
    assert response.json()["code"] == "PROVIDER_TIMEOUT"


def test_audio_endpoint_returns_the_transcript_only(monkeypatch):
    """Facts are extracted later, from the transcript the patient confirmed."""
    with (
        patch(
            "extraction.router.transcription_service",
            return_value=GroqTranscriber(api_key="test-token"),
        ),
        patch.object(
            GroqTranscriber,
            "transcribe",
            new=AsyncMock(
                return_value=Transcription(
                    "Sudah minum obat empat biji.", "groq", "whisper-large-v3-turbo"
                )
            ),
        ) as transcribe,
        patch("extraction.router.extraction_service") as extraction,
    ):
        response = client.post(
            "/ai/extractions/check-in/audio",
            files={"audio": ("speech.wav", b"fake-wav", "audio/wav")},
        )
    assert response.status_code == 200
    assert response.json() == {"transcript": "Sudah minum obat empat biji."}
    transcribe.assert_awaited_once()
    # The transcriber is the only provider touched on this route.
    extraction.assert_not_called()


def test_audio_endpoint_keeps_distinct_transcription_providers(monkeypatch):
    monkeypatch.setenv("TIBY_TRANSCRIBER", "fish")
    with patch.object(
        FishAudioTranscriber,
        "transcribe",
        new=AsyncMock(return_value=Transcription("Sudah minum.", "fish", "transcribe-1-pro")),
    ):
        response = client.post(
            "/ai/extractions/check-in/audio",
            files={"audio": ("speech.wav", b"fake-wav", "audio/wav")},
        )
    assert response.status_code == 200
    assert response.json()["transcript"] == "Sudah minum."


def test_audio_endpoint_rejects_non_audio_upload():
    response = client.post(
        "/ai/extractions/check-in/audio",
        files={"audio": ("note.txt", b"not audio", "text/plain")},
    )
    assert response.status_code == 415
    assert response.json()["code"] == "INVALID_REQUEST"


def test_audio_endpoint_rejects_empty_upload():
    response = client.post(
        "/ai/extractions/check-in/audio",
        files={"audio": ("empty.wav", b"", "audio/wav")},
    )
    assert response.status_code == 413
    assert response.json()["code"] == "INVALID_REQUEST"


def test_audio_extract_alias_uses_the_same_audio_contract(monkeypatch):
    with patch.object(
        GroqTranscriber,
        "transcribe",
        new=AsyncMock(return_value=Transcription("Sudah minum.", "groq", "whisper")),
    ):
        response = client.post(
            "/audio/extract", files={"audio": ("speech.wav", b"audio", "audio/wav")}
        )
    assert response.status_code == 200
    assert response.json() == {"transcript": "Sudah minum."}


def test_audio_endpoint_rejects_oversized_upload(monkeypatch):
    monkeypatch.setenv("MAX_AUDIO_UPLOAD_BYTES", "4")
    response = client.post(
        "/ai/extractions/check-in/audio",
        files={"audio": ("speech.wav", b"12345", "audio/wav")},
    )
    assert response.status_code == 413
    assert response.json()["code"] == "INVALID_REQUEST"


def test_audio_endpoint_accepts_a_transcript_over_the_extraction_limit(monkeypatch):
    """A long recording is still transcribed; only the later JSON extract caps length."""
    long_text = "mual " * 1500
    with patch.object(
        GroqTranscriber,
        "transcribe",
        new=AsyncMock(
            return_value=Transcription(long_text, "groq", "whisper-large-v3-turbo")
        ),
    ):
        response = client.post(
            "/ai/extractions/check-in/audio",
            files={"audio": ("speech.wav", b"fake-wav", "audio/wav")},
        )
    assert response.status_code == 200
    assert response.json()["transcript"] == long_text


def test_audio_endpoint_maps_transcription_timeout(monkeypatch):
    monkeypatch.setenv("NARAROUTER_API_TOKEN", "test-router-token")
    monkeypatch.setenv("NARAROUTER_BASE_URL", "https://router.test/v1")
    with patch.object(
        GroqTranscriber,
        "transcribe",
        new=AsyncMock(side_effect=ProviderTimeoutError("timed out")),
    ):
        response = client.post(
            "/ai/extractions/check-in/audio",
            files={"audio": ("speech.wav", b"fake-wav", "audio/wav")},
        )
    assert response.status_code == 504
    assert response.json()["code"] == "PROVIDER_TIMEOUT"


def test_guidance_endpoint_returns_null_without_evidence():
    with patch("guidance.router.SQLiteRetriever") as retriever_cls:
        retriever_cls.return_value.search.return_value = []
        response = client.post(
            "/ai/guidance", json={"question": "Topik yang tidak ada di indeks."}
        )
    assert response.status_code == 200
    assert response.json()["answer"] is None
    assert response.json()["grounded"] is False
    assert response.json()["limitations"]


def test_guidance_endpoint_packs_evidence_for_answerer():
    evidence = [
        Evidence(
            Citation(
                "chunk-1",
                "who-demo",
                "WHO",
                "Demo guidance",
                2025,
                7,
                None,
                "https://who.int",
            ),
            "Adherence support text.",
        )
    ]
    expected = GuidanceResponse(answer="ok", grounded=False, limitations=[])
    from main import app

    retriever = patch("guidance.router.SQLiteRetriever").start()
    answerer = patch("guidance.router.GroundedAnswerer").start()
    try:
        app.state.guidance_retriever = retriever.return_value
        app.state.guidance_answerer = answerer.return_value
        retriever.return_value.search.return_value = evidence
        answerer.return_value.answer = AsyncMock(return_value=expected)
        response = client.post("/ai/guidance", json={"question": "Apa itu TB?"})
    finally:
        patch.stopall()
    assert response.status_code == 200
    assert response.json()["answer"] == "ok"
    question, transcript, packed = answerer.return_value.answer.await_args.args
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


def test_onboarding_ocr_route_returns_a_draft(monkeypatch):
    expected = {
        "patientName": None,
        "regimenCode": None,
        "dailyPillQuota": None,
        "startDate": None,
        "targetEndDate": None,
        "confidence": 0.0,
        "rawText": "",
        "fieldConfidence": {},
        "uncertainties": [],
    }
    with patch("onboarding_ocr.router.extract_onboarding_card", return_value=expected):
        response = client.post(
            "/ocr/extract",
            files={"cardImage": ("card.png", b"image-bytes", "image/png")},
        )
    assert response.status_code == 200
    assert response.json() == expected


def test_onboarding_ocr_rejects_non_image_upload():
    response = client.post(
        "/ocr/extract", files={"cardImage": ("card.txt", b"text", "text/plain")}
    )
    assert response.status_code == 415
    assert response.json()["code"] == "INVALID_REQUEST"


def test_onboarding_ocr_accepts_jpg_mime_type(monkeypatch):
    draft = {
        "patientName": None,
        "regimenCode": None,
        "dailyPillQuota": None,
        "startDate": None,
        "targetEndDate": None,
        "confidence": 0.0,
        "rawText": "",
        "fieldConfidence": {},
        "uncertainties": [],
    }
    with patch("onboarding_ocr.router.extract_onboarding_card", return_value=draft):
        response = client.post(
            "/ocr/extract", files={"cardImage": ("card.jpg", b"bytes", "image/jpg")}
        )
    assert response.status_code == 200
    assert response.json() == draft


def test_nararouter_provider_builds_configured_request_and_validates_response():
    seen = {}

    def handler(request):
        seen["url"] = str(request.url)
        seen["authorization"] = request.headers.get("authorization")
        seen["body"] = json.loads(request.content)
        return httpx.Response(
            200,
            json={
                "choices": [{"message": {"content": json.dumps(response_payload())}}]
            },
        )

    real_client = httpx.AsyncClient

    async def run_test():
        transport = httpx.MockTransport(handler)
        with patch(
            "providers.nararouter.httpx.AsyncClient",
            side_effect=lambda **kwargs: real_client(transport=transport, **kwargs),
        ):
            extractor = NaraRouterExtractor(router_client(model="laguna-s-2.1"))
            result = await extractor.extract(
                CheckInRequest(transcript="Sudah minum obat empat biji.")
            )
        assert result.extraction.medication.dose_count == 4

    asyncio.run(run_test())
    assert seen["url"] == "https://router.test/v1/chat/completions"
    assert seen["authorization"] == "Bearer test-token"
    assert seen["body"]["model"] == "laguna-s-2.1"
    assert seen["body"]["response_format"] == {"type": "json_object"}
    assert "Do not diagnose" in seen["body"]["messages"][0]["content"]


def test_nararouter_provider_rejects_unexpected_risk_decision():
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
            "providers.nararouter.httpx.AsyncClient",
            side_effect=lambda **kwargs: real_client(transport=transport, **kwargs),
        ):
            extractor = NaraRouterExtractor(router_client())
            with pytest.raises(ProviderError):
                await extractor.extract(CheckInRequest(transcript="Sudah minum obat."))

    asyncio.run(run_test())


def test_nararouter_timeout_maps_to_provider_timeout():
    def handler(request):
        raise httpx.TimeoutException("timed out")

    real_client = httpx.AsyncClient

    async def run_test():
        transport = httpx.MockTransport(handler)
        with (
            patch(
                "providers.nararouter.httpx.AsyncClient",
                side_effect=lambda **kwargs: real_client(transport=transport, **kwargs),
            ),
            pytest.raises(ProviderTimeoutError),
        ):
            await router_client().chat_json("system", "user")

    asyncio.run(run_test())


def test_groq_provider_uses_configured_token_and_returns_transcript(monkeypatch):
    monkeypatch.setenv("GROQ_ENDPOINT", "https://api.groq.com/openai/v1")
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
            "providers.groq.httpx.AsyncClient",
            side_effect=lambda **kwargs: real_client(transport=transport, **kwargs),
        ):
            return await GroqTranscriber(api_key="groq-test-token").transcribe(
                b"wav-bytes"
            )

    result = asyncio.run(run_test())
    assert result.text == "Sudah minum obat."
    assert result.provider == "groq"
    assert result.model == "whisper-large-v3-turbo"
    assert seen["authorization"] == "Bearer groq-test-token"
    assert seen["path"] == "/openai/v1/audio/transcriptions"


def test_groq_provider_requires_an_endpoint(monkeypatch):
    monkeypatch.delenv("GROQ_ENDPOINT", raising=False)
    with (
        patch("providers.groq.httpx.AsyncClient") as client_factory,
        pytest.raises(ProviderConfigurationError),
    ):
        asyncio.run(GroqTranscriber(api_key="groq-test-token").transcribe(b"wav"))
    client_factory.assert_not_called()


def test_guidance_action_request_fails_closed_without_provider_call(monkeypatch):
    monkeypatch.setenv("NARAROUTER_API_TOKEN", "dummy")
    monkeypatch.setenv("NARAROUTER_BASE_URL", "https://router.test/v1")
    with patch("providers.nararouter.httpx.AsyncClient") as client_factory:
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
    with patch("providers.nararouter.httpx.AsyncClient") as client_factory:
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
    from extraction.prompts import CHECKIN_EXTRACTION_SYSTEM

    assert "intent to stop taking the medication only" in CHECKIN_EXTRACTION_SYSTEM
    assert "return []" in CHECKIN_EXTRACTION_SYSTEM
    assert (
        "Set severity to unknown unless the speaker explicitly qualifies it"
        in CHECKIN_EXTRACTION_SYSTEM
    )
    assert "null" in CHECKIN_EXTRACTION_SYSTEM


def test_prompt_keeps_ambiguous_transcript_as_quoted_data():
    from extraction.prompts import render_checkin_user_prompt

    prompt = render_checkin_user_prompt("lupa {json} dan belum minum")
    assert '"lupa {json} dan belum minum"' in prompt
    assert "{transcript}" not in prompt
