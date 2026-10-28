"""Rule-based fallback extractor and DTO mapper.

Transparent keyword baseline used for offline smoke tests and deterministic
tests. It is not an LLM and not clinically validated; production extraction
uses :class:`providers.agnes.AgnesExtractor`.

Also houses the mapper from internal facts to the public audio DTO, because
both share the same keyword tables in :mod:`.constants`.
"""

import re

from contracts import (
    AiAudioExtractionResponse,
    CheckInRequest,
    CheckInResponse,
    Extraction,
    MedicationReport,
    Symptom,
)
from extraction.constants import (
    DOSE_DIGIT_PATTERN,
    DOSE_WORD_PATTERN,
    KNOWN_SYMPTOMS,
    NUMBER_WORDS,
    STOP_PHRASES,
    SYMPTOMS,
)


# ---------------------------------------------------------------------------
# Rule-based extraction
# ---------------------------------------------------------------------------
def _extract_dose_count(text: str) -> int | None:
    """Read a pill count that is directly stated (digit or number word + unit)."""
    digit_match = DOSE_DIGIT_PATTERN.search(text)
    if digit_match:
        return int(digit_match.group(1))

    word_match = DOSE_WORD_PATTERN.search(text)
    return NUMBER_WORDS[word_match.group(1)] if word_match else None


def extract_check_in(request: CheckInRequest) -> CheckInResponse:
    """Extract facts with keyword rules; confidence stays a fixed 0.5 baseline."""
    text = " ".join(request.transcript.lower().split())
    medication_taken: bool | None = None
    if re.search(r"\b(belum|tidak|nggak|gak)\b.{0,30}\b(minum|obat)\b", text):
        medication_taken = False
    elif re.search(r"\b(sudah|minum|telah)\b", text) and re.search(
        r"\b(obat|oat|pil)\b", text
    ):
        medication_taken = True

    dose_count = _extract_dose_count(text)

    symptoms: list[Symptom] = []
    for term in SYMPTOMS:
        match = re.search(re.escape(term), text)
        if match:
            symptoms.append(
                Symptom(name=term, severity="unknown", evidence=match.group(0))
            )

    intent = any(phrase in text for phrase in STOP_PHRASES)
    uncertainties: list[str] = []
    if medication_taken is None:
        uncertainties.append(
            "Tidak dapat memastikan laporan konsumsi obat dari transkrip."
        )
    if not symptoms:
        uncertainties.append(
            "Tidak ada gejala yang dikenali oleh baseline; ini bukan bukti bahwa pasien tanpa gejala."
        )
    if not intent and any(
        term in text for term in ("berhenti", "gak lanjut", "nggak lanjut")
    ):
        uncertainties.append("Kemungkinan niat berhenti perlu dikonfirmasi manusia.")

    return CheckInResponse(
        extraction=Extraction(
            medication=MedicationReport(taken=medication_taken, dose_count=dose_count),
            symptoms=symptoms,
            possible_red_flags=[],
            intent_to_stop=intent,
        ),
        confidence=0.5,
        uncertainties=uncertainties,
    )


# DTO mapper
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
