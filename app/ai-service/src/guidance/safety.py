"""Deterministic guard for personal clinical action requests.

The guidance endpoint answers general educational questions. Anything that asks
Pandu to decide something for this specific person (start/stop/adjust
medication, dosing, switching treatment) never reaches the language model; it is
redirected to a treating healthcare professional instead.

The guard answers a narrow question: *is Pandu being asked to make a decision
for this patient?* It deliberately does NOT fire on informational questions that
merely contain a modal word. "Kenapa obat harus diminum setiap hari?" and
"Bolehkah diminum bersamaan dengan makanan?" are education, not decisions, so
bare ``harus``/``bolehkah`` are no longer blockers on their own; they only count
when the question is framed around the speaker (see ``_PERSONAL_SUBJECT``).

Unambiguous personal actions stay fail-closed regardless of framing: dosing,
stopping, continuing, and switching treatment. Those are exactly the decisions
this product must never make, so they are matched directly.

This guard runs on the question and, when supplied, the patient transcript, so
an action request hidden in either one is still caught. Callers should treat a
hit as "do not answer personally", not as a medical classification.
"""

import re

ACTION_REQUEST_PATTERNS: tuple[re.Pattern[str], ...] = tuple(
    re.compile(pattern)
    for pattern in (
        # Dosing and dose changes.
        r"\b(?:dosis|overdosis)\b",
        r"\bberapa\s+(?:tablet|butir|obat|biji|pil|mg|dosis)\b",
        r"\b(?:tambah(?:kan)?|menambah(?:kan)?|ditambah(?:kan)?|menggandakan|gandakan|dobel(?:kan)?)\b",
        r"\b(?:kurangi|mengurangi|dikurangi|dikurangkan)\b",
        # Stopping or continuing treatment.
        r"\b(?:berhenti|berhentikan|menghentikan|hentikan|menyetop|stop)\b",
        r"\b(?:lanjut|lanjutkan|melanjutkan|dilanjutkan|meneruskan|teruskan)\b",
        # Switching or changing treatment.
        r"\b(?:ganti|mengganti|diganti|ubah|mengubah|diubah|rubah)\b",
        # English fallbacks.
        r"\b(?:what\s+)?should\s+(?:i|we)\b",
        r"\b(?:change|adjust|skip)\b",
    )
)


# Modals that only become a personal decision when the speaker is the subject.
_PERSONAL_MODAL = r"(?:harus|haruskah|harusnya|sebaiknya|sebaik|perlukah|bolehkah|boleh|perlu)"
# First/second person, or the patient being discussed in a transcript.
_PERSONAL_SUBJECT = r"(?:saya|aku|gue|ku|kamu|anda|pasien)"

PERSONAL_DECISION_PATTERNS: tuple[re.Pattern[str], ...] = (
    # "haruskah saya berhenti", "apakah saya boleh menambah", "saya harus minum berapa".
    re.compile(rf"\b(?:apakah\s+)?{_PERSONAL_SUBJECT}\s+(?:\w+\s+){{0,3}}{_PERSONAL_MODAL}\b"),
    re.compile(rf"\b{_PERSONAL_MODAL}\s+{_PERSONAL_SUBJECT}\b"),
    # "apa yang harus saya lakukan" is the common inverse framing.
    re.compile(rf"\bapa\s+yang\s+(?:harus|sebaiknya)\s+{_PERSONAL_SUBJECT}\b"),
)


def detect_action_request(*texts: str | None) -> bool:
    """Return True when any supplied text asks for a personal decision or action."""
    combined = " ".join(text.lower() for text in texts if text)
    if any(pattern.search(combined) for pattern in ACTION_REQUEST_PATTERNS):
        return True
    return any(pattern.search(combined) for pattern in PERSONAL_DECISION_PATTERNS)
