import pytest

from contracts import CheckInResponse
from extraction.extractor import to_backend_extraction


def result(*, taken, intent, symptoms=None, confidence=0.9):
    return CheckInResponse.model_validate(
        {
            "schema_version": "1.0",
            "extraction": {
                "medication": {"taken": taken, "dose_count": 2},
                "symptoms": symptoms or [],
                "possible_red_flags": [],
                "intent_to_stop": intent,
            },
            "confidence": confidence,
            "uncertainties": [],
        }
    )


@pytest.mark.parametrize(
    ("taken", "expected"),
    [(True, "SUDAH_MINUM"), (False, "BELUM_MINUM"), (None, "TIDAK_PASTI")],
)
def test_medication_taken_mapping(taken, expected):
    assert to_backend_extraction("text", result(taken=taken, intent=False)).medicationTaken == expected


@pytest.mark.parametrize(
    ("intent", "expected"), [(True, True), (False, False), (None, False)]
)
def test_stop_intent_mapping(intent, expected):
    assert to_backend_extraction("text", result(taken=True, intent=intent)).intentToStopOrRefuse is expected


def test_symptom_mapping_matches_name_or_evidence_and_deduplicates():
    value = result(
        taken=True,
        intent=False,
        symptoms=[
            {"name": "Mual", "evidence": "mual sejak pagi"},
            {"name": "Keluhan", "evidence": "batuk darah"},
            {"name": "Unknown", "evidence": "tidak dikenali"},
        ],
    )
    assert to_backend_extraction("text", value).symptoms == ["MUAL_RINGAN", "BATUK_DARAH"]


@pytest.mark.parametrize(
    ("taken", "intent", "confidence"),
    [(None, False, 0.74), (True, None, 0.74), (True, False, 0.9)],
)
def test_confidence_is_capped_when_domain_fields_are_uncertain(taken, intent, confidence):
    mapped = to_backend_extraction("text", result(taken=taken, intent=intent))
    assert mapped.extractionConfidence == confidence
