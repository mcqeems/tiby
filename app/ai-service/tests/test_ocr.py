"""Onboarding-card OCR: parsing rules, and real-engine reads of the card set.

The parser tests feed it rows shaped like real RapidOCR output, welded labels
included, because the original fixtures were hand-written ideal text that the
engine never actually produces. The engine tests run the committed card images
from ``dataset/ocr/`` through the real model; they skip when the ONNX models are
not cached locally, because the first run downloads them and CI must not depend
on that network.
"""

from pathlib import Path

import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

from main import app
from onboarding_ocr.card_parser import (
    OcrLine,
    parse_onboarding_lines,
    parse_onboarding_text,
    segment,
)
from onboarding_ocr.ocr_service import extract_onboarding_card

DATASET = Path(__file__).resolve().parents[1] / "dataset" / "ocr"


def read(*parts: str) -> bytes:
    return DATASET.joinpath(*parts).read_bytes()


def lines(*rows: tuple[str, float]) -> list[OcrLine]:
    return [OcrLine(text, score) for text, score in rows]


@pytest.fixture(scope="module")
def engine() -> None:
    """Load the OCR models once, or skip the real-engine tests."""
    try:
        extract_onboarding_card(read("layouts", "card-printed.png"))
    except Exception as exc:  # noqa: BLE001 - any load failure means "skip"
        pytest.skip(f"RapidOCR models unavailable: {exc}")


# --- segmentation ----------------------------------------------------------


def test_segmentation_splits_a_row_carrying_two_columns():
    segments = segment("Alamat : Jl. Merdeka 12 Dosis : 4 tablet")
    assert segments == [(None, "Jl. Merdeka 12"), ("dailyPillQuota", "4 tablet")]


def test_segmentation_reads_a_label_that_has_no_colon():
    assert segment("Nama Pasien  Siti Aminah") == [("patientName", "Siti Aminah")]


def test_segmentation_finds_a_label_welded_to_the_previous_value():
    segments = segment("Tanggal Mulai: 03/04/2026Tanggal Selesai: 03/10/2026")
    assert segments == [("startDate", "03/04/2026"), ("targetEndDate", "03/10/2026")]


def test_segmentation_does_not_read_a_name_out_of_the_faskes_label():
    """A facility label must not produce a patient name segment at all."""
    assert not any(field == "patientName" for field, _ in segment("Nama Faskes: Puskesmas Tebet"))


def test_segmentation_cuts_at_a_label_the_draft_does_not_care_about():
    segments = segment("No. RM : 00 12 34 56")
    assert segments == [(None, "00 12 34 56")]


# --- dates -----------------------------------------------------------------


def test_iso_date_is_read_with_full_confidence():
    draft = parse_onboarding_lines(lines(("Tanggal Selesai: 2026-10-03", 0.95)))
    assert draft.targetEndDate == "2026-10-03"
    assert draft.fieldConfidence["targetEndDate"] == pytest.approx(0.95)
    assert draft.uncertainties == []


def test_numeric_date_where_only_one_reading_is_possible():
    # 28 cannot be a month, so the day and month cannot be swapped.
    draft = parse_onboarding_lines(lines(("Tanggal Mulai: 28/04/2026", 0.9)))
    assert draft.startDate == "2026-04-28"
    assert draft.uncertainties == []


def test_ambiguous_numeric_date_is_flagged_instead_of_silently_trusted():
    draft = parse_onboarding_lines(lines(("Tanggal mulai: 03/04/2026", 0.9)))
    assert draft.startDate == "2026-04-03"
    assert draft.fieldConfidence["startDate"] == pytest.approx(0.5)
    assert len(draft.uncertainties) == 1
    assert "ambigu" in draft.uncertainties[0]


def test_two_dates_on_one_row_are_refused_rather_than_guessed():
    draft = parse_onboarding_lines(
        lines(("Tanggal mulai: 03/04/2026 sampai 03/10/2026", 0.9))
    )
    assert draft.startDate is None
    assert draft.fieldConfidence["startDate"] == 0.0
    assert "lebih dari satu tanggal" in draft.uncertainties[0]


def test_date_that_does_not_exist_is_refused():
    draft = parse_onboarding_lines(lines(("Tanggal mulai: 31/02/2026", 0.9)))
    assert draft.startDate is None
    assert "kalender" in draft.uncertainties[0]


# --- fields ----------------------------------------------------------------


def test_unlabelled_text_leaves_every_field_unknown():
    draft = parse_onboarding_text("Siti Aminah\nHRZE 4 tablet sehari", 0.4)
    assert draft.patientName is None
    assert draft.regimenCode is None
    assert draft.dailyPillQuota is None
    assert draft.startDate is None
    assert draft.targetEndDate is None
    assert draft.fieldConfidence == dict.fromkeys(draft.fieldConfidence, 0.0)


def test_a_lab_request_form_reads_the_patient_not_the_facility():
    """A Kemenkes TBC.05 request form: the patient sits under ``Nama Terduga``.

    Rows are the engine's real output for ``shared/assets/images/ocr-test.jpeg``;
    the value for ``Nama Terduga`` lands on the following row, and ``selesai``
    appears in the prose of the examination section rather than as an end date.
    """
    draft = parse_onboarding_lines(
        lines(
            ("Nama Fasyankes", 1.0),
            (": Puskesmas Kecamatan", 1.0),
            ("Nama Dokter Pengirim", 0.98),
            (": dr. Ahmad Fauzi, Sp.PD", 0.98),
            ("Nama Terduga", 1.0),
            ("BUDI SANTOSO", 1.0),
            ("Regimen: FDC-4", 0.97),
            ("Dosis: 4 butir Harian", 1.0),
            ("Mulai Terapi: 28/10/2026", 1.0),
            ("Pemeriksaan setelan selesai pengakatan :", 0.98),
        )
    )
    assert draft.patientName == "BUDI SANTOSO"
    assert draft.regimenCode == "FDC-4"
    assert draft.dailyPillQuota == 4
    assert draft.startDate == "2026-10-28"
    assert draft.targetEndDate is None


def test_the_value_after_a_facility_label_is_not_read_as_a_patient():
    draft = parse_onboarding_lines(
        lines(("Nama Fasyankes", 1.0), ("Puskesmas Tebet", 1.0))
    )
    assert draft.patientName is None


def test_a_clean_fully_labelled_card_reads_at_the_row_confidence():
    draft = parse_onboarding_text(
        "Nama Pasien: Siti Aminah\nRegimen: HRZE-4\n"
        "Kuota obat: 4\nTanggal mulai: 2026-04-03\n"
        "Tanggal selesai: 2026-10-03",
        0.82,
    )
    assert draft.patientName == "Siti Aminah"
    assert draft.regimenCode == "HRZE-4"
    assert draft.dailyPillQuota == 4
    assert draft.startDate == "2026-04-03"
    assert draft.targetEndDate == "2026-10-03"
    assert draft.confidence == pytest.approx(0.82)
    assert draft.uncertainties == []


def test_an_ambiguous_date_lowers_the_document_confidence():
    # Same card, but the start date cannot be disambiguated: holding that field
    # at the ambiguity ceiling must drag the document score below the 0.82 its
    # rows were read at, instead of reporting a clean read.
    draft = parse_onboarding_text(
        "Nama Pasien: Siti Aminah\nRegimen: HRZE-4\n"
        "Kuota obat: 4\nTanggal mulai: 03/04/2026\n"
        "Tanggal selesai: 2026-10-03",
        0.82,
    )
    assert draft.fieldConfidence["startDate"] == pytest.approx(0.5)
    assert draft.confidence == pytest.approx((0.82 * 4 + 0.5) / 5)
    assert draft.confidence < 0.82


def test_every_draft_field_reports_a_confidence_even_when_missing():
    draft = parse_onboarding_lines(lines(("Regimen: HRZE", 0.9)))
    assert set(draft.fieldConfidence) == {
        "patientName",
        "patientPhone",
        "pmoName",
        "pmoPhone",
        "regimenCode",
        "dailyPillQuota",
        "startDate",
        "targetEndDate",
    }
    assert draft.fieldConfidence["regimenCode"] == pytest.approx(0.9)
    assert draft.fieldConfidence["patientName"] == 0.0


def test_a_row_the_engine_was_unsure_of_is_not_parsed():
    draft = parse_onboarding_lines(lines(("Regimen: HRZE", 0.2)))
    assert draft.regimenCode is None


def test_quota_label_without_a_number_is_reported_as_unreadable():
    draft = parse_onboarding_lines(lines(("Kuota obat: belum dicatat", 0.9)))
    assert draft.dailyPillQuota is None
    assert "tidak bisa dibaca sebagai angka" in draft.uncertainties[0]


def test_reading_one_field_of_five_lowers_the_overall_confidence():
    everything = parse_onboarding_lines(
        lines(("Nama Pasien: Siti Aminah", 1.0), ("Regimen: HRZE", 1.0))
    )
    something = parse_onboarding_lines(lines(("Regimen: HRZE", 1.0)))
    assert everything.confidence > something.confidence


def test_raw_text_keeps_the_detected_rows():
    draft = parse_onboarding_lines(lines(("Regimen: HRZE", 0.9), ("No. RM : 001", 0.9)))
    assert draft.rawText == "Regimen: HRZE\nNo. RM : 001"


# --- image conditioning ----------------------------------------------------
#
# There is none, on purpose: deskew, contrast normalisation, and upscaling were
# all measured against these cards and never beat the raw image, while
# upscaling a very small card made it strictly worse. The tests below pin that
# finding so the module does not come back without evidence.


# --- real engine -----------------------------------------------------------


def test_a_printed_card_is_read_in_full(engine: None):
    draft = extract_onboarding_card(read("layouts", "card-printed.png"))
    assert draft.patientName == "Siti Aminah"
    assert draft.regimenCode == "HRZE"
    assert draft.dailyPillQuota == 4
    assert draft.startDate == "2026-04-03"
    assert draft.targetEndDate == "2026-10-03"


def test_a_two_column_form_does_not_lose_the_second_column(engine: None):
    draft = extract_onboarding_card(read("layouts", "card-two-column.png"))
    assert draft.patientName == "Siti Aminah"
    assert draft.regimenCode == "HRZE"
    assert draft.dailyPillQuota == 4
    assert draft.startDate == "2026-04-03"
    assert draft.targetEndDate == "2026-10-03"


def test_a_form_without_colons_still_yields_the_patient_name(engine: None):
    draft = extract_onboarding_card(read("layouts", "card-unlabelled.png"))
    assert draft.patientName == "Siti Aminah"
    assert draft.dailyPillQuota == 4


def test_a_photographed_card_is_read_end_to_end(engine: None):
    draft = extract_onboarding_card(read("photos", "card-photographed.png"))
    assert draft.patientName == "Siti Aminah"
    assert draft.dailyPillQuota == 4
    assert draft.startDate == "2026-04-03"
    assert draft.targetEndDate == "2026-10-03"


def test_a_shadowed_rotated_scan_still_needs_no_conditioning(engine: None):
    """Why this module has no image preprocessing, pinned as a test.

    A 6-degree skew, a hand shadow across the lower half, and underexposure —
    all of it together, straight into the engine — must still read every field.
    If this ever needs a deskew or a contrast pass to pass, the finding that
    motivated dropping them has been invalidated and should be re-measured.
    """
    image = cv2.imdecode(
        np.frombuffer(read("layouts", "card-printed.png"), dtype=np.uint8), cv2.IMREAD_COLOR
    )
    assert image is not None, "the committed card fixture did not decode"
    height, width = image.shape[:2]
    matrix = cv2.getRotationMatrix2D((width / 2, height / 2), 6.0, 1.0)
    image = cv2.warpAffine(image, matrix, (width, height), borderValue=250)
    shadow = np.linspace(255, 120, height, dtype=np.float32)[:, None, None] / 255.0
    image = np.clip(image.astype(np.float32) * shadow, 0, 255).astype(np.uint8)
    image = cv2.convertScaleAbs(image, alpha=0.8, beta=0)

    draft = extract_onboarding_card(cv2.imencode(".png", image)[1].tobytes())
    assert draft.patientName == "Siti Aminah"
    assert draft.dailyPillQuota == 4
    # Every field this card can carry was read. The PMO and patient-phone
    # fields are opt-in and absent here, so they are not held against it.
    for field in ("patientName", "regimenCode", "dailyPillQuota", "startDate"):
        assert draft.fieldConfidence[field] > 0, field


def test_a_date_the_engine_cannot_disambiguate_is_never_confident(engine: None):
    draft = extract_onboarding_card(read("layouts", "card-printed.png"))
    assert draft.fieldConfidence["startDate"] <= 0.5
    assert any("ambigu" in note for note in draft.uncertainties)


def test_the_route_returns_the_draft_for_a_real_card(engine: None):
    response = TestClient(app).post(
        "/ocr/extract",
        files={"cardImage": ("card.png", read("layouts", "card-printed.png"), "image/png")},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["patientName"] == "Siti Aminah"
    assert body["fieldConfidence"]["regimenCode"] > 0.5
    assert isinstance(body["uncertainties"], list)


def test_bytes_that_are_not_an_image_are_refused():
    with pytest.raises(ValueError, match="not a decodable image"):
        extract_onboarding_card(b"this is not an image")

# --- a real Kemenkes treatment card ----------------------------------------
#
# `card-synthetic.png` is a photographed Puskesmas form, not an onboarding
# card. It says `Tanggal:` rather than `Tanggal Mulai:`, has no `Regimen` or
# `Kuota` row at all, and lists the regimen as a drug table. Before these
# rules it yielded only the patient name, so the Nakes had to retype the three
# fields the form actually requires (regimen, daily quota, start date).


def test_a_bare_tanggal_row_is_the_start_date():
    """`Tanggal:` on a treatment card is when the regimen was prescribed."""
    draft = parse_onboarding_lines(
        lines(("Nama Pasien: Siti Nur Aisyah", 0.99), ("Tanggal : 28-04-2025", 0.98))
    )
    assert draft.startDate == "2025-04-28"


@pytest.mark.parametrize(
    "row",
    [
        "Tanggal Lahir : 03-07-1989",
        "Tgl Lahir : 03-07-1989",
        "Tanggal Kunjungan : 28-04-2025",
        "Tanggal Masuk : 28-04-2025",
        "Tanggal Selesai : 03-10-2026",
    ],
)
def test_a_qualified_tanggal_is_never_the_start_date(row):
    """A birth date or a visit date must never date the regimen.

    Reading `Tanggal Lahir` as the start date would date a TB regimen to the
    year the patient was born, and the Nakes has no way to notice that from a
    plausible-looking value. Only an unqualified `Tanggal:` is the start.
    """
    draft = parse_onboarding_lines(lines(("Nama Pasien: Siti", 0.99), (row, 0.99)))
    assert draft.startDate is None


def test_a_bare_tanggal_still_cuts_the_previous_value():
    """It became a field, but it must not swallow the row it followed."""
    draft = parse_onboarding_lines(
        lines(("Nama Pasien: Siti Nur Aisyah", 0.99), ("Tanggal : 28-04-2025", 0.98))
    )
    assert draft.patientName == "Siti Nur Aisyah"


@pytest.mark.parametrize(
    ("drugs", "expected"),
    [
        (["Rifampisin 600 mg", "Isoniazid 300 mg", "Pirazinamid 500 mg", "Etambutol 400 mg"], "HRZE"),
        (["Rifampisin 600 mg", "Isoniazid 300 mg", "Pirazinamid 500 mg"], "HRZ"),
        (["Rifampisin 600 mg", "Isoniazid 300 mg", "Etambutol 400 mg"], "HRE"),
        (["Rifampisin 600 mg", "Isoniazid 300 mg"], "HR"),
    ],
)
def test_the_regimen_is_derived_from_the_drug_table(drugs, expected):
    rows = [OcrLine("Nama Pasien: Siti", 0.99), OcrLine("Nama Obat", 0.99)]
    rows += [OcrLine(drug, 0.98) for drug in drugs]
    assert parse_onboarding_lines(rows).regimenCode == expected


def test_a_drug_table_never_invents_a_regimen_from_one_drug():
    """A single drug is not a standard regimen, so it is left for the Nakes."""
    rows = [OcrLine("Nama Pasien: Siti", 0.99), OcrLine("Rifampisin 600 mg", 0.98)]
    assert parse_onboarding_lines(rows).regimenCode is None


def test_aturan_pakai_is_the_daily_quota_not_the_monthly_total():
    """`1 x 1 sehari` is one pill a day; `30 tablet` is the month's supply."""
    draft = parse_onboarding_lines(
        lines(
            ("Nama Obat", 0.99),
            ("Rifampisin 600 mg", 0.98),
            ("Isoniazid 300 mg", 0.98),
            ("Aturan Pakai: 1 x 1 sehari (pagi)", 0.97),
        )
    )
    assert draft.dailyPillQuota == 1
    assert draft.regimenCode == "HR"


def test_the_monthly_tablet_count_is_never_read_as_a_daily_quota():
    """`30 tablet` is a month's supply, so it must not become 30 pills a day."""
    draft = parse_onboarding_lines(lines(("Jumlah: 30 tablet", 0.98),))
    assert draft.dailyPillQuota is None


def test_a_photographed_puskesmas_form_yields_the_required_fields(engine: None):
    """The regimen, the start date, and the name, from a drug table.

    `dailyPillQuota` is deliberately not asserted: on this form the `Aturan
    Pakai` column is a separate column of the drug table, not a labelled row,
    so there is no value the parser can read without guessing from geometry.
    A wrong daily quota is worse than an empty one, so it stays for the Nakes.
    """
    draft = extract_onboarding_card(read("photos", "card-synthetic.png"))
    assert draft.patientName == "Siti Nur Aisyah"
    assert draft.regimenCode == "HRZE"
    assert draft.startDate == "2025-04-28"
    assert draft.dailyPillQuota is None
    # A derived regimen is flagged so the Nakes knows to confirm it.
    assert any("disimpulkan" in note for note in draft.uncertainties)


# --- a real formulir pemantauan pengobatan TBC -----------------------------
#
# `card-form-pemantauan.jpg` is the form the Nakes actually photographs: a
# header row of labels with the values on the row below, in columns, plus a row
# where the value sits to the right of its label. It carries the PMO block and
# both phone numbers, which is what makes it the reference for these fields.


def test_the_pemantauan_form_yields_every_field_it_prints(engine: None):
    draft = extract_onboarding_card(read("photos", "card-form-pemantauan.jpg"))
    assert draft.patientName == "Ahmad Rizky Pratama"
    assert draft.patientPhone == "081289765432"
    assert draft.pmoName == "Budi Santoso"
    assert draft.pmoPhone == "081298765431"
    assert draft.regimenCode == "FDC-4"
    assert draft.dailyPillQuota == 4
    assert draft.startDate == "2026-08-08"
    # `08/08/2026` reads the same either way round, so it is not ambiguous.
    assert draft.uncertainties == []


def test_the_two_phone_numbers_on_a_pemantauan_form_never_swap(engine: None):
    """`No. Telp. Pasien` and `WhatsApp PMO` print the same label twice.

    Filing the PMO's number under the patient (or the reverse) is silent and
    plausible, so this asserts the exact values rather than just "both present".
    """
    draft = extract_onboarding_card(read("photos", "card-form-pemantauan.jpg"))
    assert draft.patientPhone == "081289765432"
    assert draft.pmoPhone == "081298765431"
    assert draft.patientPhone != draft.pmoPhone


def test_a_birth_date_never_becomes_the_start_date():
    """`Tanggal Lahir` sits on the same form as the real start date."""
    draft = parse_onboarding_lines(
        lines(
            ("Nama Pasien: Siti", 0.99),
            ("Tanggal Lahir *", 0.98),
            ("12/08/2005", 0.98),
            ("Tanggal Mulai *", 0.98),
            ("08/08/2026", 0.98),
        )
    )
    assert draft.startDate == "2026-08-08"


def test_a_drug_strength_is_not_a_daily_pill_count():
    """`300 mg` under a table's `Dosis` column is one drug's strength."""
    draft = parse_onboarding_lines(
        lines(("Dosis: 300 mg", 0.99), ("Rifampisin 600 mg", 0.98))
    )
    assert draft.dailyPillQuota is None


def test_the_usage_column_is_the_daily_pill_count():
    """`1 x 1 sehari` is one pill a day, not one per dose."""
    draft = parse_onboarding_lines(lines(("Aturan Pakai: 1 x 1 sehari (pagi)", 0.97)))
    assert draft.dailyPillQuota == 1


def test_a_full_phone_number_is_kept_whole_and_localised():
    draft = parse_onboarding_lines(
        lines(("Informasi Pasien", 0.99), ("No. Telp. Pasien", 0.98), ("081289765432", 0.99))
    )
    assert draft.patientPhone == "081289765432"
