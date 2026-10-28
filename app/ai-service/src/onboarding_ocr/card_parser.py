"""Card parsing rules, independent of any OCR engine or image library.

This module is pure: it takes the rows a recogniser detected, each with that
recogniser's confidence, and returns a draft. Keeping it free of OpenCV and
RapidOCR is what makes the rules testable in milliseconds, and it is where every
field-level bug has actually lived.
"""

from __future__ import annotations

import datetime
from typing import NamedTuple

from contracts import OcrOnboardingDraft
from onboarding_ocr.constants import (
    AMBIGUOUS_DATE_CONFIDENCE,
    COMPILED_LABELS,
    DRAFT_FIELDS,
    ISO_DATE_PATTERN,
    MIN_LINE_SCORE,
    NUMERIC_DATE_PATTERN,
    QUOTA_PATTERN,
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
    match = QUOTA_PATTERN.search(value)
    if match is None:
        return None
    quota = int(match.group(1))
    return quota if quota >= 1 else None


def _parse_regimen(value: str) -> str | None:
    match = REGIMEN_PATTERN.search(value)
    return match.group(1).upper() if match else None


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


def parse_onboarding_lines(lines: list[OcrLine]) -> OcrOnboardingDraft:
    """Build a draft from detected rows, each carrying its own OCR score."""
    reads: dict[str, tuple[str, float]] = {}
    for line in lines:
        if line.score < MIN_LINE_SCORE:
            continue
        for field, value in segment(line.text):
            if field is None or not value:
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
