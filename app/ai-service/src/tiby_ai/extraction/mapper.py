"""Mappings from extracted domain facts to the public audio DTO."""

from ..contracts import AiAudioExtractionResponse, CheckInResponse

KNOWN_SYMPTOMS = {
    "batuk darah": "BATUK_DARAH",
    "sesak": "SESAK_NAPAS",
    "kuning": "KUNING_IKTERIK",
    "muntah hebat": "MUNTAH_HEBAT",
    "gangguan penglihatan": "GANGGUAN_PENGLIHATAN",
    "gangguan pendengaran": "GANGGUAN_PENDENGARAN",
    "ruam": "RUAM_KULIT_BERAT",
    "demam tinggi": "DEMAM_TINGGI_MENETAP",
    "urine merah": "URINE_MERAH",
    "mual": "MUAL_RINGAN",
    "nyeri sendi": "NYERI_SENDI_RINGAN",
    "lemas": "MENGANTUK_LEMAS",
}


def to_backend_extraction(
    transcript: str, result: CheckInResponse
) -> AiAudioExtractionResponse:
    """Convert internal facts to the flat shared frontend/backend DTO."""
    medication = result.extraction.medication
    symptoms = list(
        dict.fromkeys(
            code
            for symptom in result.extraction.symptoms
            for phrase, code in KNOWN_SYMPTOMS.items()
            if phrase in symptom.name.lower() or phrase in symptom.evidence.lower()
        )
    )
    uncertain = medication.taken is None or result.extraction.intent_to_stop is None
    return AiAudioExtractionResponse(
        transcript=transcript,
        medicationTaken=(
            "TIDAK_PASTI"
            if medication.taken is None
            else "SUDAH_MINUM"
            if medication.taken
            else "BELUM_MINUM"
        ),
        pillsTakenCount=medication.dose_count,
        symptoms=symptoms,
        intentToStopOrRefuse=result.extraction.intent_to_stop is True,
        extractionConfidence=min(result.confidence, 0.74)
        if uncertain
        else result.confidence,
    )
