"""Deterministic fail-closed guard for personal clinical action requests.

The guidance endpoint answers general educational questions only. Anything that
looks like a request for a personal decision or action (start/stop/adjust
medication, dosing, switching treatment) never reaches the language model; it is
redirected to a treating healthcare professional instead.

This guard is intentionally biased towards false positives: it runs on the
question and, when supplied, the patient transcript, so an action request hidden
in either one is still caught. Callers should treat a hit as "do not answer
personally", not as a medical classification.
"""

import re

ACTION_REQUEST_PATTERNS: tuple[re.Pattern[str], ...] = tuple(
    re.compile(pattern)
    for pattern in (
        # Personal decision questions (harus/haruskah/harusnya/sebaiknya/...).
        r"\b(?:harus|haruskah|harusnya|sebaiknya|sebaik|perlukah|bolehkah)\b",
        r"\bapa\s+yang\s+(?:harus|sebaiknya)\b",
        r"\bapakah\s+(?:saya\s+)?(?:boleh|perlu|harus)\b",
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


def detect_action_request(*texts: str | None) -> bool:
    """Return True when any supplied text asks for a personal decision or action."""
    combined = " ".join(text.lower() for text in texts if text)
    return any(pattern.search(combined) for pattern in ACTION_REQUEST_PATTERNS)
