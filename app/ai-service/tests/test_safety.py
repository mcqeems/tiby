import pytest

from guidance.safety import detect_action_request


@pytest.mark.parametrize(
    "text",
    [
        "Haruskah saya berhenti minum obat?",
        "Berapa biji obat yang perlu saya minum sekarang?",
        "Bolehkah saya menambah dosis?",
        "Saya ingin menggandakan dosis obat saya.",
        "Apa yang harus saya lakukan kalau lupa minum?",
        "Apakah aman menghentikan pengobatan sekarang?",
        "Should I stop my medication?",
        "Obat saya diubah, apakah boleh?",
        # Personal framing with a modal verb still blocks even without a dosing word.
        "Saya harus minum berapa tablet?",
        "Apakah saya boleh minum obat dengan kopi?",
    ],
)
def test_detects_personal_action_requests(text):
    assert detect_action_request(text) is True


@pytest.mark.parametrize(
    "text",
    [
        "Apa itu tuberkulosis?",
        "Apa saja keluhan ringan yang dicatat saat terapi TBC?",
        "Menurut panduan, apakah mual termasuk efek samping umum obat TB?",
        "Saya mual dari siang.",
        # Informational questions that merely contain a modal verb. These were
        # blocked by a bare harus/bolehkah pattern and reported as out of scope
        # even though the user was only asking for education.
        "Kenapa obat harus diminum setiap hari?",
        "Bolehkah diminum bersamaan dengan makanan?",
        "Bagaimana kalau obat diminum terlambat?",
        "Apakah TB menular?",
        "Halo Pandu, kamu siapa?",
        "Fitur apa saja yang ada di Tiby?",
    ],
)
def test_allows_general_educational_questions(text):
    assert detect_action_request(text) is False


def test_scans_question_and_transcript_together():
    assert detect_action_request("Apa itu tuberkulosis?", "Haruskah saya berhenti minum obat TB saya?")
    assert detect_action_request("Apa itu tuberkulosis?", "Saya minum obat pagi ini.") is False


def test_ignores_missing_texts():
    assert detect_action_request(None, "") is False
