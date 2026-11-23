"""Deterministic guardrails for guidance queries.

Two tiers keep Tanya Pandu both safe and genuinely usable:

1. **Hard fail-closed (`detect_prompt_injection`)** — instruction overrides,
   jailbreaks, or attempts to force unsafe directives are rejected immediately
   without calling the language model.
2. **Clinical caution (`detect_clinical_caution`)** — personal dosing math,
   stopping/switching medication, or drug-prescription requests still reach the
   model so Pandu can explain general context (e.g., regimens like FDC-4/FDC-3
   assigned at onboarding) or simple safe comfort steps, while deterministically
   enforcing a strong recommendation to contact the treating Nakes/Faskes.

App-usage questions ("cara ganti password", "cara stop notifikasi") and general
educational queries ("kenapa tidak boleh berhenti minum obat?") trigger neither.
"""

import re
from typing import Literal

CautionCategory = Literal["dosing", "medication_change", "prescription"]

PROMPT_INJECTION_PATTERNS: tuple[re.Pattern[str], ...] = tuple(
    re.compile(pattern)
    for pattern in (
        r"\b(?:abaikan|lupakan|hiraukan|lewati)\s+(?:\w+\s+){0,2}(?:system\s*prompt|prompt|instruksi|aturan|panduan\s+sistem)\b",
        r"\b(?:ignore|disregard|forget|override|bypass)\s+(?:\w+\s+){0,2}(?:system\s*prompt|prompt|instructions?|rules?|guardrails?)\b",
        r"\b(?:jailbreak|developer\s+mode)\b",
        r"\b(?:katakan|bilang|jawab|tulis)\s+(?:bahwa\s+)?pasien\s+(?:harus|boleh|wajib)\s+(?:menggandakan|gandakan|dobel|berhenti|stop)\b",
    )
)

DOSING_CAUTION_PATTERNS: tuple[re.Pattern[str], ...] = tuple(
    re.compile(pattern)
    for pattern in (
        r"\bberapa\s+(?:tablet|butir|biji|pil|mg|dosis|obat)\b",
        r"\b(?:gandakan|menggandakan|dobel(?:kan)?|overdosis)\b",
        r"\b(?:tambah(?:kan)?|menambah(?:kan)?|ditambah(?:kan)?|kurangi|mengurangi|dikurangi|ubah|mengubah|diubah|ganti|mengganti|diganti|sesuaikan)\s+(?:\w+\s+){0,2}(?:dosis|tablet|butir|pil|takaran)\b",
        r"\bdosis\s+(?:saya|ku|aku|pasien|yang\s+harus|untuk\s+saya)\b",
    )
)

MEDICATION_CHANGE_PATTERNS: tuple[re.Pattern[str], ...] = tuple(
    re.compile(pattern)
    for pattern in (
        r"\b(?:berhenti|berhentikan|menghentikan|hentikan|menyetop|stop|jeda|lewatkan|skip|ganti|mengganti|diganti|ubah|mengubah|diubah|switch|change|adjust)\s+(?:\w+\s+){0,2}(?:obat|oat|terapi|pengobatan|regimen|med(?:ication|icine)?|pills?)\b",
        r"\b(?:obat|oat|terapi|pengobatan|regimen)\s+(?:\w+\s+){0,2}(?:berhenti|dihentikan|distop|diganti|diubah|dijeda|dilewatkan)\b",
        r"\b(?:haruskah|bolehkah|sebaiknya|mending|should\s+i)\s+(?:saya\s+|aku\s+)?(?:\w+\s+){0,2}(?:berhenti|stop|jeda|ganti|ubah|skip)\b",
    )
)

PRESCRIPTION_CAUTION_PATTERNS: tuple[re.Pattern[str], ...] = tuple(
    re.compile(pattern)
    for pattern in (
        r"\bobat\s+apa\s+(?:yang\s+)?(?:harus|sebaiknya|perlu|bisa|cocok|ampuh)\s+(?:saya|aku|pasien|diminum)\b",
        r"\b(?:resepkan|berikan\s+resep|rekomendasikan\s+obat)\b",
    )
)

# General "why/consequence" questions ("kenapa tidak boleh berhenti minum obat?")
# are educational unless paired with explicit personal decision intent.
_WHY_EDUCATIONAL_PATTERN = re.compile(
    r"\b(?:kenapa|mengapa|apa\s+(?:bahaya|dampak|akibat|risiko|efek)(?:nya)?)\b"
)
_PERSONAL_DECISION_INTENT = re.compile(
    r"\b(?:haruskah|bolehkah|sebaiknya|mending|ingin|mau|rencana|berencana|should\s+i)\s+(?:saya|aku|gue)\b|\b(?:saya|aku|gue)\s+(?:harus|boleh|ingin|mau)\b"
)


def _join_texts(*texts: str | None) -> str:
    return " ".join(text.lower() for text in texts if text)


def detect_prompt_injection(*texts: str | None) -> bool:
    """Return True only when supplied text attempts to override system safety rules."""
    combined = _join_texts(*texts)
    if not combined:
        return False
    return any(pattern.search(combined) for pattern in PROMPT_INJECTION_PATTERNS)


def detect_clinical_caution(*texts: str | None) -> CautionCategory | None:
    """Classify personal clinical decision prompts that require soft guidance + Nakes referral."""
    combined = _join_texts(*texts)
    if not combined:
        return None
    if any(pattern.search(combined) for pattern in DOSING_CAUTION_PATTERNS):
        return "dosing"
    if any(pattern.search(combined) for pattern in PRESCRIPTION_CAUTION_PATTERNS):
        return "prescription"
    if any(pattern.search(combined) for pattern in MEDICATION_CHANGE_PATTERNS):
        if _WHY_EDUCATIONAL_PATTERN.search(combined) and not _PERSONAL_DECISION_INTENT.search(combined):
            return None
        return "medication_change"
    return None


# Alias kept for existing runners that check hard-blocked requests.
detect_action_request = detect_prompt_injection
