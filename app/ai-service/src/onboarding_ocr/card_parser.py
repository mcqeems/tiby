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
    """One detected row of text, its confidence, and where it sits on the page.

    ``x``/``y``/``y_end`` are optional so the parser stays usable on plain text
    (``parse_onboarding_text``) and in tests. They are what makes a form whose
    labels and values sit in separate rows, side by side in columns, parseable
    at all: ``Nama Lengkap PMO`` and ``WhatsApp PMO`` are both labels on one row,
    and the values that belong to them are on the row below.
    """

    text: str
    score: float
    x: float = 0.0
    y: float = 0.0
    y_end: float = 0.0
    x_end: float = 0.0


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
        fixed.append(line._replace(text=text) if text != line.text else line)
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

    A milligram reading is never a pill count: `300 mg` under a table's `Dosis`
    column is the strength of one drug, and reporting it as 300 tablets a day
    is worse than reporting nothing.
    """
    if _MILLIGRAM_PATTERN.search(value):
        return None
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
    if first == second:
        # `08/08/2026` reads the same either way round, so there is nothing to
        # disambiguate and flagging it would teach Nakes to ignore the warning.
        return _validated_date(year, second, first)
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
    """Average the fields that were read, scaled by how many were read at all.

    The denominator is the fields the *document* could carry, not every field in
    the contract: a Kemenkes treatment card has no PMO block at all, and
    counting its PMO fields as misses would report a fully read card as barely
    half read.
    """
    relevant = {
        field: score
        for field, score in confidence.items()
        if field in _reporting_fields(lines)
    }
    read = [score for score in relevant.values() if score > 0]
    if not read:
        return min((line.score for line in lines), default=0.0)
    coverage = len(read) / len(relevant)
    return sum(read) / len(read) * coverage


def _reporting_fields(lines: list[OcrLine]) -> set[str]:
    """Which contract fields this particular document could plausibly carry.

    The PMO block and the patient phone number are opt-in: TB.01 prints them,
    many treatment cards do not. The document decides, so a card without a PMO
    section is not penalised for fields it was never going to have.
    """
    fields = {
        "patientName",
        "regimenCode",
        "dailyPillQuota",
        "startDate",
        "targetEndDate",
    }
    text = " ".join(line.text for line in lines)
    if _PMO_SECTION.search(text):
        fields |= {"pmoName", "pmoPhone"}
    if _ANY_PHONE_LABEL.search(text):
        fields.add("patientPhone")
    return fields


_DATE_FIELDS = frozenset({"startDate", "targetEndDate"})
_PHONE_FIELDS = frozenset({"patientPhone", "pmoPhone"})
"""Assigned by section (``_assign_phones_by_section``), never by label text."""

_ROW_GAP_FACTOR = 1.6
"""How far below a label row its value row may sit, in label-row heights."""
_COLUMN_TOLERANCE = 60.0
"""Pixels of slack when deciding a value sits under a label's column."""
_SAME_ROW_REACH = 50.0
"""How far right of a label a same-row value may start before it is a neighbour.

Measured on the committed forms: a value that belongs to a label starts within
about 45 px of the label's end, while the next label in the row starts 117 px or
more away. Anything wider swallows the neighbouring label as a value.
"""

_PHONE_VALUE = re.compile(r"[+(]?[\d][\d\s().-]{6,}[\d]")
"""A whole row that is just a phone number, no label attached."""

_MILLIGRAM_PATTERN = re.compile(r"\d\s*(?:mg|mcg|gram|g)\b", re.IGNORECASE)
"""A drug strength, which is never a pill count."""

_PATIENT_SECTION = re.compile(r"informasi\s*pasien|identitas\s*pasien|data\s*pasien", re.IGNORECASE)
_PMO_SECTION = re.compile(r"pengawas\s*menelan|\bpmo\b", re.IGNORECASE)
"""Section headers that decide whose phone number a bare number belongs to."""

_ANY_PHONE_LABEL = re.compile(
    r"(?:whats?app|\bwa\b|no\.?\s*(?:telp|telpon|telepon|hp|hape))", re.IGNORECASE
)
"""Any phone-number wording at all, used only to decide whether to report it."""
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
    return following.text.strip(" \t:.-\u2022\u00b7*")


def _read_value_below(lines: list[OcrLine], index: int) -> str:
    """Read the value that sits in the same column, one row below a label.

    A form laid out as a header row of labels (``Nama Lengkap PMO`` |
    ``WhatsApp PMO`` | ...) with the filled-in values on the next row needs the
    *column* to pair them, not the reading order: the values arrive as one flat
    row, so the second label would otherwise take the first value.

    Only used when the label carries no value of its own, and only when the
    candidate row is a different row on the page. Returns ``""`` when the
    layout carries no usable geometry, so plain-text parsing is unaffected.
    """
    label = lines[index]
    if label.y_end <= 0 or label.x_end <= label.x:
        return ""
    best: tuple[tuple[int, int, float, float], str] | None = None
    for candidate in lines:
        if candidate is label or candidate.score < MIN_LINE_SCORE:
            continue
        if segment(candidate.text):
            continue
        # Two layouts carry the value: to the right on the same row (most
        # Puskesmas forms), or in the same column one row below (a header row of
        # labels with the answers underneath). Anything else is a different
        # field's value and must not be taken.
        # A value on the label's own row only counts when it sits close enough
        # to be *this* field's value. Beyond a column's width the neighbour is
        # another label (`Nama Lengkap PMO *` has `Username PMO *` to its
        # right), and the real value is the row underneath.
        # A value that belongs to the label starts close to it. The allowed gap
        # scales with the label's own width, because a short label (`Nama`) is
        # followed by a wider gap before its rule and value than a long one
        # (`Nama Lengkap Pasien *`). It stays well under the distance to the
        # next label in the row, measured at 117 px and up on these forms.
        reach = max(_SAME_ROW_REACH, (label.x_end - label.x) * 0.5)
        # `: Siti Nur Aisyah` is unambiguously this label's value however far
        # right it starts: no incoming label begins with a colon. That is what
        # keeps `Nama` followed by a wide gap and a rule working, without
        # widening the gap for plain text where the next word is a new label.
        is_colon_value = candidate.text.lstrip().startswith((":", "\uff1a"))
        if is_colon_value:
            reach = float("inf")
        same_row = (
            candidate.y < label.y_end
            and candidate.y_end > label.y
            and label.x_end - _COLUMN_TOLERANCE
            <= candidate.x
            <= label.x_end + reach
        )
        below_row = (
            candidate.y > label.y_end
            and candidate.y - label.y_end
            <= (_ROW_GAP_FACTOR * (label.y_end - label.y)) + 1
            and label.x - _COLUMN_TOLERANCE <= candidate.x <= label.x_end
        )
        if not (same_row or below_row):
            continue
        # Same row beats a later row, an overlapping column beats a stray one,
        # then the cleanest read, then nearest. Confidence comes before distance
        # on purpose: a half-detected glyph often sits one pixel closer than the
        # value beside it, and `曲` at 0.50 must not win over `08/08/2026` at
        # 1.00 merely because it starts 30 px earlier.
        vertical_rank = 0 if same_row else 1
        overlaps = (
            candidate.x < label.x_end + _COLUMN_TOLERANCE
            and candidate.x_end > label.x - _COLUMN_TOLERANCE
        )
        distance = (
            abs(candidate.x - label.x_end) if same_row else abs(candidate.x - label.x)
        )
        rank = (vertical_rank, 0 if overlaps else 1, -candidate.score, distance)
        if best is None or rank < best[0]:
            best = (rank, candidate.text.strip(" \t:.-\u2022\u00b7*"))
    return best[1] if best else ""


def _assign_phones_by_section(lines: list[OcrLine]) -> dict[str, tuple[str, float]]:
    """Decide whose phone number each detected number is, using the section.

    TB.01 prints the same ``No.telp/Hp`` wording twice, once for the patient and
    once for the PMO. Filing the PMO's number under the patient is silent and
    plausible, so the number is assigned by which section header it appears
    under rather than by the label wording.

    Returns the same ``{field: (value, score)}`` shape as the main parse.
    """
    numbers = [
        line
        for line in lines
        if line.score >= MIN_LINE_SCORE and _PHONE_VALUE.fullmatch(line.text.strip())
    ]
    headers = sorted(
        (
            (line.y, "patient" if _PATIENT_SECTION.search(line.text) else "pmo")
            for line in lines
            if _PATIENT_SECTION.search(line.text) or _PMO_SECTION.search(line.text)
        ),
        key=lambda item: item[0],
    )
    reads: dict[str, tuple[str, float]] = {}
    for number in numbers:
        owner = "patient"
        for position, section in headers:
            if position <= number.y:
                owner = section
            else:
                break
        field = "pmoPhone" if owner == "pmo" else "patientPhone"
        value = _normalise_phone(number.text)
        if value is None:
            continue
        previous = reads.get(field)
        if previous is None or number.score > previous[1]:
            reads[field] = (value, number.score)
    return reads


def _normalise_phone(raw: str) -> str | None:
    """Keep digits, turning an Indonesian ``+62`` into a local ``0``.

    Returns ``None`` when the result is not a plausible phone number, so a
    stray NIK or BPJS number is never reported as a contact number.
    """
    digits = re.sub(r"\D", "", raw)
    if digits.startswith("62"):
        digits = "0" + digits[2:]
    if not (8 <= len(digits) <= 15):
        return None
    if not digits.startswith("0"):
        return None
    return digits


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
                # Same column, next row: the label-row / value-row layout that
                # a form with four labels side by side uses. Falls back to the
                # next reading row for the stacked layout.
                value = _read_value_below(lines, index) or _next_row_value(lines, index)
            if not value:
                continue
            if field in _DATE_FIELDS and not any(char.isdigit() for char in value):
                continue
            if field == "patientName" and _NOT_A_PERSON.search(value):
                continue
            if field in _PHONE_FIELDS:
                continue
            previous = reads.get(field)
            if previous is None or line.score > previous[1]:
                reads[field] = (value, line.score)

    # Phone numbers carry their own resolution: the same `No.telp/Hp` label is
    # printed twice on TB.01, so which number belongs to whom comes from the
    # section it sits under, not from the label that introduced it.
    for field, found in _assign_phones_by_section(lines).items():
        previous = reads.get(field)
        if previous is None or found[1] > previous[1]:
            reads[field] = found

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
        patientPhone=_read_simple(reads, "patientPhone", confidence),
        pmoName=_read_simple(reads, "pmoName", confidence),
        pmoPhone=_read_simple(reads, "pmoPhone", confidence),
        regimenCode=regimen_code,
        dailyPillQuota=quota,
        startDate=dates.get("startDate"),
        targetEndDate=dates.get("targetEndDate"),
        confidence=_overall_confidence(confidence, lines),
        rawText="\n".join(line.text for line in lines),
        fieldConfidence=confidence,
        uncertainties=uncertainties,
    )


def _read_simple(
    reads: dict[str, tuple[str, float]], field: str, confidence: dict[str, float]
) -> str | None:
    """Take a plain-text field out of ``reads``, recording its confidence."""
    found = reads.get(field)
    if found is None:
        return None
    confidence[field] = found[1]
    return found[0]


def parse_onboarding_text(text: str, confidence: float) -> OcrOnboardingDraft:
    """Parse a flat transcript with one confidence for every row."""
    return parse_onboarding_lines(
        [
            OcrLine(line.strip(), confidence)
            for line in text.splitlines()
            if line.strip()
        ]
    )
