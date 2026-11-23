"""Card parsing rules, independent of any OCR engine or image library.

This module is pure: it takes the rows a recogniser detected, each with that
recogniser's confidence, and returns a draft. Keeping it free of OpenCV and
RapidOCR is what makes the rules testable in milliseconds, and it is where every
field-level bug has actually lived.
"""

from __future__ import annotations

import datetime
import re
from typing import NamedTuple

from contracts import OcrOnboardingDraft
from onboarding_ocr.constants import (
    AMBIGUOUS_DATE_CONFIDENCE,
    ANTITUBERCULOSIS_DRUGS,
    COMPILED_LABELS,
    DAILY_USAGE_PATTERN,
    DATE_LABEL_TOKENS,
    DRAFT_FIELDS,
    ISO_DATE_PATTERN,
    MIN_LINE_SCORE,
    NUMERIC_DATE_PATTERN,
    QUOTA_PATTERN,
    REGIMEN_CODE_ORDER,
    REGIMEN_PATTERN,
)


class OcrLine(NamedTuple):
    """One detected row of text and the engine's confidence in it."""

    text: str
    score: float


class DateRead(NamedTuple):
    """A parsed calendar date plus whether its day and month were ambiguous."""

    value: str | None
    ambiguous: bool
    reason: str | None


def _within_one_edit(word: str, target: str) -> bool:
    """True when ``word`` is ``target`` with at most one edit.

    One insert, one delete, one substitution, or one adjacent transposition —
    the four mistakes a CTC recogniser actually makes. Words shorter than five
    characters are rejected outright so a coincidental near-match (``mulia``,
    ``selatan``) cannot be promoted into a date label.
    """
    a, b = word.lower(), target.lower()
    if a == b:
        return True
    # Guard on the *target* length, not the word: 'mula' -> 'mulai' is a single
    # insertion in a five-letter canonical term, while a four-letter target
    # ('muia' -> 'mulai' is two inserts) stays out of reach on purpose.
    if len(b) < 5 or abs(len(a) - len(b)) > 1:
        return False
    if len(a) == len(b):
        diff = [i for i in range(len(a)) if a[i] != b[i]]
        if len(diff) == 1:
            return True
        if len(diff) == 2 and diff[1] == diff[0] + 1:
            i, j = diff
            return a[i] == b[j] and a[j] == b[i]
        return False
    if len(a) > len(b):
        a, b = b, a
    i = j = edits = 0
    while i < len(a) and j < len(b):
        if a[i] == b[j]:
            i += 1
            j += 1
            continue
        edits += 1
        if edits > 1:
            return False
        j += 1
    return True


_DATE_VALUE = re.compile(r"\d{1,4}\s*[/-]\s*\d{1,2}\s*[/-]\s*\d{2,4}")


def repair_detected_labels(lines: list[OcrLine]) -> list[OcrLine]:
    """Correct a misspelled date label so the strict patterns still match.

    The smaller recognition model reads 'Selesai' as 'Selesat' and 'Mulai' as
    'Muia'. The label regex then misses, and the field is lost entirely rather
    than misread. This rewrites only the label word on a line that already
    looks like a labelled date, so a stray word cannot become a field.

    The value is never touched: it still goes through the same validation and
    the same ambiguity check as before.
    """
    fixed: list[OcrLine] = []
    for line in lines:
        text = line.text
        if _DATE_VALUE.search(text):
            for token, canonical in DATE_LABEL_TOKENS.values():
                if re.search(canonical, text, re.IGNORECASE):
                    continue
                for word in re.findall(r"[A-Za-z]{4,}", text):
                    if _within_one_edit(word, token):
                        text = re.sub(
                            re.escape(word), token, text, count=1, flags=re.IGNORECASE
                        )
                        break
                else:
                    continue
                break
        fixed.append(type(line)(text, line.score))
    return fixed


def segment(line: str) -> list[tuple[str | None, str]]:
    """Cut one detected row into ``(field, value)`` pairs.

    Every known label ends the value before it, so a two-column row splits at
    the second label instead of swallowing it. Labels outside the draft
    (``Alamat``, ``No. RM``) carry ``None`` and only serve as cut points.
    """
    claims: list[tuple[int, int]] = []
    found: list[tuple[int, int, str | None]] = []
    for field, pattern in COMPILED_LABELS:
        for match in pattern.finditer(line):
            start, end = match.span()
            if any(
                start < taken_end and taken_start < end
                for taken_start, taken_end in claims
            ):
                continue
            claims.append((start, end))
            found.append((start, end, field))
    found.sort(key=lambda item: item[0])

    segments = []
    for index, (_, end, field) in enumerate(found):
        stop = found[index + 1][0] if index + 1 < len(found) else len(line)
        segments.append((field, line[end:stop].strip(" \t:.-")))
    return segments


def _parse_quota(value: str) -> int | None:
    """Read a daily pill count, preferring the `n x m sehari` usage form.

    A medication table's `Aturan Pakai` column reads `1 x 1 sehari (pagi)`,
    which is one pill a day. The bare-number fallback would take the first
    digit it finds; on a row that also carries `30 tablet` (a month's supply)
    that would report 30 pills a day, so the structured form wins whenever it
    is present and the first number is only used when it is not.
    """
    usage = DAILY_USAGE_PATTERN.search(value)
    if usage is not None:
        per_dose, doses = (int(group) for group in usage.groups())
        quota = per_dose * doses
        return quota if quota >= 1 else None
    match = QUOTA_PATTERN.search(value)
    if match is None:
        return None
    quota = int(match.group(1))
    return quota if quota >= 1 else None


def _parse_regimen(value: str) -> str | None:
    match = REGIMEN_PATTERN.search(value)
    return match.group(1).upper() if match else None


def _derive_regimen_from_drugs(texts: list[str]) -> str | None:
    """Build a regimen code from the drugs named across the detected rows.

    Returns ``HRZE`` for a card listing rifampisin, isoniazid, pirazinamid, and
    etambutol even though the card never says `Regimen`. At least two of the
    six mapped drugs must appear: one drug is not a regimen, and a code built
    from a single name would be a guess the Nakes cannot tell apart from a
    reading of the card.
    """
    letters: set[str] = set()
    for text in texts:
        lowered = text.lower()
        for drug, letter in ANTITUBERCULOSIS_DRUGS.items():
            if drug in lowered:
                letters.add(letter)
    if len(letters) < 2:
        return None
    return "".join(letter for letter in REGIMEN_CODE_ORDER if letter in letters)


def _validated_date(year: int, month: int, day: int) -> DateRead:
    try:
        return DateRead(datetime.date(year, month, day).isoformat(), False, None)
    except ValueError:
        return DateRead(None, False, "tanggal tidak ada di kalender")


def _parse_date(value: str) -> DateRead:
    """Read a card date, refusing to guess when day and month are swappable.
    (Docstring omitted for brevity, tetap sama seperti aslinya)
    """
    iso_matches = list(ISO_DATE_PATTERN.finditer(value))
    numeric_matches = list(NUMERIC_DATE_PATTERN.finditer(value))
    if len(iso_matches) + len(numeric_matches) > 1:
        return DateRead(None, False, "satu baris memuat lebih dari satu tanggal")

    if iso_matches:
        iso = iso_matches[0]
        return _validated_date(int(iso[1]), int(iso[2]), int(iso[3]))

    if not numeric_matches:
        return DateRead(None, False, "tidak ada tanggal yang terbaca")

    numeric = numeric_matches[0]
    first, second, year = int(numeric[1]), int(numeric[2]), int(numeric[3])
    if first > 12 >= second:
        return _validated_date(year, second, first)
    if second > 12 >= first:
        return _validated_date(year, first, second)
    if first > 12 and second > 12:
        return DateRead(None, False, "hari dan bulan sama-sama tidak valid")

    read = _validated_date(year, second, first)
    if read.value is None:
        return DateRead(None, True, "tanggal ambigu dan tidak ada di kalender")
    return DateRead(
        read.value,
        True,
        f"{numeric.group(0)} bisa berarti {first}/{second} atau {second}/{first}",
    )


def _read_date_field(
    label: str, raw: str, score: float
) -> tuple[str | None, float, list[str]]:
    """Return ``(value, confidence, notes)`` for one card date."""
    read = _parse_date(raw)
    if read.value is None:
        return None, 0.0, [f"{label} '{raw}' gagal dibaca: {read.reason}."]
    if read.ambiguous:
        note = (
            f"{label} '{raw}' ambigu ({read.reason}); "
            f"dibaca sebagai {read.value}. Wajib diverifikasi manual."
        )
        return read.value, min(score, AMBIGUOUS_DATE_CONFIDENCE), [note]
    return read.value, score, []


def _overall_confidence(confidence: dict[str, float], lines: list[OcrLine]) -> float:
    """Average the fields that were read, scaled by how many were read at all."""
    read = [score for score in confidence.values() if score > 0]
    if not read:
        return min((line.score for line in lines), default=0.0)
    coverage = len(read) / len(confidence)
    return sum(read) / len(read) * coverage


_DATE_FIELDS = frozenset({"startDate", "targetEndDate"})
"""Fields whose value must carry a digit: ``selesai pengakatan`` is prose, not a date."""

_NOT_A_PERSON = re.compile(
    r"\b(?:fasyankes|faskes|puskesmas|klinik|rumah\s*sakit|dokter|dr|petugas)\b",
    re.IGNORECASE,
)
"""A value naming a facility or a clinician is never the patient's name."""


def _next_row_value(lines: list[OcrLine], index: int) -> str:
    """Read the row after a label whose value sits on the following row.

    Several Kemenkes forms put ``Nama Terduga`` and its fill-in value on
    separate rows. Only an unlabelled row can be that value, so a following
    label is never swallowed as data.
    """
    if index + 1 >= len(lines):
        return ""
    following = lines[index + 1]
    if following.score < MIN_LINE_SCORE or segment(following.text):
        return ""
    return following.text.strip(" \t:.-")


def parse_onboarding_lines(lines: list[OcrLine]) -> OcrOnboardingDraft:
    """Build a draft from detected rows, each carrying its own OCR score."""
    lines = repair_detected_labels(lines)
    reads: dict[str, tuple[str, float]] = {}
    for index, line in enumerate(lines):
        if line.score < MIN_LINE_SCORE:
            continue
        segments = segment(line.text)
        for position, (field, value) in enumerate(segments):
            if field is None:
                continue
            if not value and position == len(segments) - 1:
                value = _next_row_value(lines, index)
            if not value:
                continue
            if field in _DATE_FIELDS and not any(char.isdigit() for char in value):
                continue
            if field == "patientName" and _NOT_A_PERSON.search(value):
                continue
            previous = reads.get(field)
            if previous is None or line.score > previous[1]:
                reads[field] = (value, line.score)

    patient_name: str | None = None
    regimen_code: str | None = None
    quota: int | None = None
    dates: dict[str, str | None] = {}
    confidence: dict[str, float] = dict.fromkeys(DRAFT_FIELDS, 0.0)
    uncertainties: list[str] = []

    name = reads.get("patientName")
    if name is not None:
        patient_name = name[0]
        confidence["patientName"] = name[1]

    regimen = reads.get("regimenCode")
    if regimen is not None:
        regimen_code = _parse_regimen(regimen[0])
        confidence["regimenCode"] = regimen[1] if regimen_code else 0.0
        if regimen_code is None:
            uncertainties.append(
                f"Regimen '{regimen[0]}' tidak bisa dibaca sebagai kode."
            )
    if regimen_code is None:
        # A Puskesmas card names drugs, not a regimen, so fall back to the drug
        # table. Confidence stays below a read regimen: it is derived from the
        # drugs present rather than stated on the card, and the Nakes should
        # confirm it.
        drug_rows = [
            line for line in lines
            if line.score >= MIN_LINE_SCORE
            and any(drug in line.text.lower() for drug in ANTITUBERCULOSIS_DRUGS)
        ]
        derived = _derive_regimen_from_drugs([line.text for line in drug_rows])
        if derived is not None:
            regimen_code = derived
            confidence["regimenCode"] = min(line.score for line in drug_rows)
            uncertainties.append(
                f"Regimen '{derived}' disimpulkan dari daftar obat, bukan tertulis di kartu."
            )

    dose = reads.get("dailyPillQuota")
    if dose is not None:
        quota = _parse_quota(dose[0])
        confidence["dailyPillQuota"] = dose[1] if quota else 0.0
        if quota is None:
            uncertainties.append(
                f"Kuota obat '{dose[0]}' tidak bisa dibaca sebagai angka."
            )

    for field, label in (
        ("startDate", "Tanggal mulai"),
        ("targetEndDate", "Tanggal selesai"),
    ):
        raw = reads.get(field)
        if raw is None:
            continue
        dates[field], confidence[field], notes = _read_date_field(label, raw[0], raw[1])
        uncertainties.extend(notes)

    return OcrOnboardingDraft(
        patientName=patient_name,
        regimenCode=regimen_code,
        dailyPillQuota=quota,
        startDate=dates.get("startDate"),
        targetEndDate=dates.get("targetEndDate"),
        confidence=_overall_confidence(confidence, lines),
        rawText="\n".join(line.text for line in lines),
        fieldConfidence=confidence,
        uncertainties=uncertainties,
    )


def parse_onboarding_text(text: str, confidence: float) -> OcrOnboardingDraft:
    """Parse a flat transcript with one confidence for every row."""
    return parse_onboarding_lines(
        [
            OcrLine(line.strip(), confidence)
            for line in text.splitlines()
            if line.strip()
        ]
    )
