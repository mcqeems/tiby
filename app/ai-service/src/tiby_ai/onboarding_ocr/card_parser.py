"""Card parsing rules, independent of any OCR engine or image library.

This module is pure: it takes the rows a recogniser detected, each with that
recogniser's confidence, and returns a draft. Keeping it free of OpenCV and
RapidOCR is what makes the rules testable in milliseconds, and it is where every
field-level bug has actually lived.

Two properties drive the design, both learned from real RapidOCR output rather
than from an imagined one:

* A card is scanned row by row and the engine returns whatever rows it detects.
  On a two-column form one detected row carries two label/value pairs
  (``Alamat : Jl. Merdeka 12 Dosis : 4 tablet``), so parsing runs on segments
  cut at the next known label instead of on the flattened text.
* Label and value are frequently separated by nothing at all — a printed form
  reads ``Nama Pasien  Siti Aminah`` — so the colon is optional, and a missing
  value leaves the field blank rather than guessing.

Anything unreadable comes back as ``null`` plus a per-field confidence and a
human-readable uncertainty, never as a plausible guess.
"""

from __future__ import annotations

import datetime
import re
from typing import NamedTuple

from ...contracts import OcrOnboardingDraft

MIN_LINE_SCORE = 0.5
"""Below this a row is treated as unread rather than parsed."""

AMBIGUOUS_DATE_CONFIDENCE = 0.5
"""A date that could be day/month either way is never a confident date."""

DRAFT_FIELDS = ("patientName", "regimenCode", "dailyPillQuota", "startDate", "targetEndDate")
"""The draft fields the contract exposes, in the order a card lists them."""

SEPARATOR = r"\s*[:=-]?\s*"
"""Cards separate label from value with a colon, an equals sign, or nothing."""

LABEL_START = r"(?<![A-Za-z])"
"""Guard placed in front of every label.

OCR routinely welds the tail of a value onto the label that follows it
(``03/04/2026Tanggal Selesai``). A plain ``\\b`` rejects that label outright, so
the value swallows the rest of the row and the date then silently resolves to
the *second* date on the line. Blocking only a preceding letter keeps the
misread guard while still finding the welded label.
"""

_LABELS: tuple[tuple[str | None, str], ...] = (
    ("patientName", rf"{LABEL_START}nama\s*pasien\b{SEPARATOR}"),
    ("regimenCode", rf"{LABEL_START}(?:regimen|paduan\s*obat)\b{SEPARATOR}"),
    (
        "dailyPillQuota",
        rf"{LABEL_START}(?:kuota(?:\s*(?:pil|obat))?|dosis(?:\s*harian)?|jumlah\s*obat)\b{SEPARATOR}",
    ),
    ("startDate", rf"{LABEL_START}(?:tanggal\s*mulai|mulai\s*berobat)\b{SEPARATOR}"),
    ("targetEndDate", rf"{LABEL_START}(?:tanggal\s*selesai|target\s*selesai)\b{SEPARATOR}"),
    ("patientName", rf"{LABEL_START}nama\b{SEPARATOR}"),
    (None, rf"{LABEL_START}tanggal\b{SEPARATOR}"),
    (
        None,
        rf"{LABEL_START}(?:no\.?\s*rm|no\.?\s*rekam\s*medis|alamat|no\.?\s*hp|telepon|faskes|catatan|keterangan)\b{SEPARATOR}",
    ),
)
"""Longest and most specific label first: a later match inside an already
claimed span is skipped, so ``Nama Pasien`` never also reads as ``Nama``."""

_COMPILED_LABELS = tuple(
    (field, re.compile(pattern, re.IGNORECASE)) for field, pattern in _LABELS
)

_QUOTA = re.compile(r"(\d{1,3})")
_REGIMEN = re.compile(r"([A-Z0-9][A-Z0-9./-]{0,19})", re.IGNORECASE)
_ISO_DATE = re.compile(r"\b(\d{4})-(\d{1,2})-(\d{1,2})\b")
_NUMERIC_DATE = re.compile(r"\b(\d{1,2})\s*[/-]\s*(\d{1,2})\s*[/-]\s*(\d{4})\b")


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
    for field, pattern in _COMPILED_LABELS:
        for match in pattern.finditer(line):
            start, end = match.span()
            if any(start < taken_end and taken_start < end for taken_start, taken_end in claims):
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
    match = _QUOTA.search(value)
    if match is None:
        return None
    quota = int(match.group(1))
    return quota if quota >= 1 else None


def _parse_regimen(value: str) -> str | None:
    match = _REGIMEN.search(value)
    return match.group(1).upper() if match else None


def _validated_date(year: int, month: int, day: int) -> DateRead:
    try:
        return DateRead(datetime.date(year, month, day).isoformat(), False, None)
    except ValueError:
        return DateRead(None, False, "tanggal tidak ada di kalender")


def _parse_date(value: str) -> DateRead:
    """Read a card date, refusing to guess when day and month are swappable.

    ``03/10/2026`` is unambiguous because 10 cannot be a day. ``03/04/2026`` is
    not: Indonesian cards mean 3 April, but an American template on the same
    card would mean 4 March. Both readings are plausible, so the date is
    returned at reduced confidence with an uncertainty attached rather than
    dropped or presented as certain.

    A segment holding more than one date is refused outright. It means a label
    went unread somewhere, and picking whichever date happened to parse first
    is how a start date silently becomes an end date.
    """
    iso_matches = list(_ISO_DATE.finditer(value))
    numeric_matches = list(_NUMERIC_DATE.finditer(value))
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


def _overall_confidence(
    confidence: dict[str, float], lines: list[OcrLine]
) -> float:
    """Average the fields that were read, scaled by how many were read at all.

    A card where only the patient name came through scores low even when that
    one name is crisp, because five missing fields is exactly what the Nakes
    needs to see before trusting the draft.
    """
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
            uncertainties.append(f"Regimen '{regimen[0]}' tidak bisa dibaca sebagai kode.")

    dose = reads.get("dailyPillQuota")
    if dose is not None:
        quota = _parse_quota(dose[0])
        confidence["dailyPillQuota"] = dose[1] if quota else 0.0
        if quota is None:
            uncertainties.append(f"Kuota obat '{dose[0]}' tidak bisa dibaca sebagai angka.")

    for field, label in (("startDate", "Tanggal mulai"), ("targetEndDate", "Tanggal selesai")):
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
    """Parse a flat transcript with one confidence for every row.

    Kept for callers that already hold OCR text without line scores; the HTTP
    path feeds :func:`parse_onboarding_lines` so each field inherits the score
    of the row it was actually read from.
    """
    return parse_onboarding_lines(
        [OcrLine(line.strip(), confidence) for line in text.splitlines() if line.strip()]
    )