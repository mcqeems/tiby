"""Rule-based fallback extractor for ``TIBY_EXTRACTOR=rules``.

Transparent keyword baseline used for offline smoke tests and deterministic
tests. It is not an LLM and not clinically validated; production extraction
uses :class:`providers.agnes.AgnesExtractor`.
"""

import re

from contracts import (
    CheckInRequest,
    CheckInResponse,
    Extraction,
    MedicationReport,
    Symptom,
)

_SYMPTOMS = (
    "mual",
    "muntah",
    "tidak nafsu makan",
    "pusing",
    "lemas",
    "sesak napas",
    "sesak",
    "ruam",
    "gatal",
    "demam",
    "nyeri",
)
_STOP_PHRASES = (
    "ingin berhenti",
    "mau berhenti",
    "tidak mau minum obat",
    "nggak mau minum obat",
    "tidak mau melanjutkan",
    "gak mau lanjut",
)


_NUMBER_WORDS = {
    "satu": 1,
    "dua": 2,
    "tiga": 3,
    "empat": 4,
    "lima": 5,
    "enam": 6,
    "tujuh": 7,
    "delapan": 8,
    "sembilan": 9,
    "sepuluh": 10,
}


def _extract_dose_count(text: str) -> int | None:
    """Read a pill count that is directly stated (digit or number word + unit)."""
    digit_match = re.search(r"\b(\d{1,2})\s*(?:biji|butir|tablet|pil)\b", text)
    if digit_match:
        return int(digit_match.group(1))

    words = "|".join(_NUMBER_WORDS)
    word_match = re.search(rf"\b({words})\s*(?:biji|butir|tablet|pil)\b", text)
    return _NUMBER_WORDS[word_match.group(1)] if word_match else None


def extract_check_in(request: CheckInRequest) -> CheckInResponse:
    """Extract facts with keyword rules; confidence stays a fixed 0.5 baseline."""
    text = " ".join(request.transcript.lower().split())
    medication_taken: bool | None = None
    if re.search(r"\b(belum|tidak|nggak|gak)\b.{0,30}\b(minum|obat)\b", text):
        medication_taken = False
    elif re.search(r"\b(sudah|minum|telah)\b", text) and re.search(r"\b(obat|oat|pil)\b", text):
        medication_taken = True

    dose_count = _extract_dose_count(text)

    symptoms: list[Symptom] = []
    for term in _SYMPTOMS:
        match = re.search(re.escape(term), text)
        if match:
            symptoms.append(Symptom(name=term, severity="unknown", evidence=match.group(0)))

    intent = any(phrase in text for phrase in _STOP_PHRASES)
    uncertainties: list[str] = []
    if medication_taken is None:
        uncertainties.append("Tidak dapat memastikan laporan konsumsi obat dari transkrip.")
    if not symptoms:
        uncertainties.append("Tidak ada gejala yang dikenali oleh baseline; ini bukan bukti bahwa pasien tanpa gejala.")
    if not any(term in text for term in _STOP_PHRASES) and any(
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
