import pytest
from pydantic import ValidationError

from tiby_ai.contracts import CheckInRequest, CheckInResponse


def test_request_accepts_indonesian_transcript_and_default_language():
    request = CheckInRequest(transcript="Sudah minum obat.")

    assert request.language == "id-ID"
    assert request.transcript == "Sudah minum obat."


def test_request_rejects_empty_transcript():
    with pytest.raises(ValidationError):
        CheckInRequest(transcript="")


def test_response_accepts_unknown_fields_as_null():
    response = CheckInResponse.model_validate(
        {
            "schema_version": "1.0",
            "extraction": {
                "medication": {"taken": None, "dose_count": None},
                "symptoms": [],
                "possible_red_flags": [],
                "intent_to_stop": None,
            },
            "confidence": 0.2,
            "uncertainties": ["Ucapan tidak jelas"],
        }
    )

    assert response.extraction.medication.taken is None
    assert response.extraction.intent_to_stop is None


def test_response_rejects_confidence_outside_range():
    payload = {
        "schema_version": "1.0",
        "extraction": {
            "medication": {"taken": True, "dose_count": 4},
            "symptoms": [],
            "possible_red_flags": [],
            "intent_to_stop": False,
        },
        "confidence": 1.1,
        "uncertainties": [],
    }

    with pytest.raises(ValidationError):
        CheckInResponse.model_validate(payload)


def test_response_rejects_unexpected_clinical_decision_field():
    payload = {
        "schema_version": "1.0",
        "extraction": {
            "medication": {"taken": True, "dose_count": 4},
            "symptoms": [],
            "possible_red_flags": [],
            "intent_to_stop": False,
            "risk_status": "controlled",
        },
        "confidence": 0.9,
        "uncertainties": [],
    }

    with pytest.raises(ValidationError):
        CheckInResponse.model_validate(payload)
