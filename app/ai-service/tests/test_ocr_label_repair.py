"""The label repair must recover misspellings without inventing fields.

The ``tiny`` recognition model reads 'Selesai' as 'Selesat' and 'Mulai' as
'Muia'. Without repair the label regex misses and the field is lost entirely.
Repair is a one-edit tolerance on the label word only, so the boundaries matter
as much as the recovery: a near-miss on some other word must never become a
date, and the value must never be rewritten.
"""

import pytest

from onboarding_ocr.card_parser import (
    OcrLine,
    _within_one_edit,
    parse_onboarding_lines,
    repair_detected_labels,
)


@pytest.mark.parametrize(
    ("word", "target"),
    [
        ("selesat", "selesai"),  # substitution: what tiny actually emits
        ("mula", "mulai"),  # deletion of the final vowel
        ("mullai", "mulai"),  # insertion
        ("selesai", "selesai"),  # already correct
        ("selesia", "selesai"),  # adjacent transposition
    ],
)
def test_one_edit_variants_are_accepted(word: str, target: str) -> None:
    assert _within_one_edit(word, target)


@pytest.mark.parametrize(
    ("word", "target"),
    [
        ("selatan", "selesai"),  # two substitutions
        ("selamat", "selesai"),  # different word, same length
        ("muia", "mulai"),  # two deletions: deliberately out of reach
        ("mulut", "mulai"),
        ("selesainya", "selesai"),  # two insertions
    ],
)
def test_unrelated_or_distant_words_are_rejected(word: str, target: str) -> None:
    assert not _within_one_edit(word, target)


def test_a_misspelled_end_date_label_is_recovered() -> None:
    draft = parse_onboarding_lines(
        [
            OcrLine("KARTU PENGOBATAN TB", 0.98),
            OcrLine("Nama Pasien: Siti Aminah", 0.98),
            OcrLine("Tanggal Mulai: 03/04/2026", 0.97),
            OcrLine("Tanggal Selesat: 03/10/2026", 0.95),
        ]
    )
    assert draft.startDate == "2026-04-03"
    assert draft.targetEndDate == "2026-10-03"


def test_a_misspelled_start_label_is_recovered() -> None:
    draft = parse_onboarding_lines(
        [
            OcrLine("Nama Pasien: Siti Aminah", 0.98),
            OcrLine("Tanggal Mula: 03/04/2026", 0.96),
            OcrLine("Tanggal Selesai: 03/10/2026", 0.97),
        ]
    )
    assert draft.startDate == "2026-04-03"
    assert draft.targetEndDate == "2026-10-03"


def test_repair_never_changes_the_value() -> None:
    """Only the label word may be rewritten, never the date on the line."""
    repaired = repair_detected_labels([OcrLine("Tanggal Selesat: 03/10/2026", 0.95)])
    assert "03/10/2026" in repaired[0].text
    assert repaired[0].score == 0.95


def test_a_line_without_a_date_is_left_alone() -> None:
    """A near-miss word with no date value must not become a field."""
    lines = [OcrLine("Alamat: Jl. Selatan No. 5", 0.9)]
    repaired = repair_detected_labels(lines)
    assert repaired[0].text == "Alamat: Jl. Selatan No. 5"
    draft = parse_onboarding_lines(lines)
    assert draft.startDate is None
    assert draft.targetEndDate is None


def test_a_correct_label_is_not_rewritten() -> None:
    lines = [OcrLine("Tanggal Selesai: 03/10/2026", 0.99)]
    repaired = repair_detected_labels(lines)
    assert repaired[0].text == "Tanggal Selesai: 03/10/2026"


def test_repair_preserves_line_order_and_count() -> None:
    lines = [
        OcrLine("KARTU PENGOBATAN TB", 0.98),
        OcrLine("Tanggal Selesat: 03/10/2026", 0.95),
        OcrLine("Regimen: HRZE", 0.99),
    ]
    repaired = repair_detected_labels(lines)
    assert len(repaired) == 3
    assert [line.score for line in repaired] == [0.98, 0.95, 0.99]
    assert repaired[0].text == "KARTU PENGOBATAN TB"


def test_an_ambiguous_date_still_warns_after_repair() -> None:
    """Repair must not launder the day/month ambiguity into false confidence."""
    draft = parse_onboarding_lines([OcrLine("Tanggal Selesat: 03/10/2026", 0.95)])
    assert draft.targetEndDate == "2026-10-03"
    assert draft.fieldConfidence["targetEndDate"] < 0.6
    assert any("ambigu" in u.lower() for u in draft.uncertainties)
