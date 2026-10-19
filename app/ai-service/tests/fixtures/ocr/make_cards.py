"""Regenerate the synthetic onboarding-card images used by ``test_ocr.py``.

The fixtures are committed PNGs so OCR regressions are caught by a plain
``uv run pytest`` on a machine that already has the models cached. Run this
only when a fixture needs to change, or to check what a card actually looks
like:

    uv run python tests/fixtures/ocr/make_cards.py

Two folders, split by which layer they are meant to catch failing: ``layouts/``
holds clean scans that exercise the field parser, ``photos/`` holds a phone
capture that exercises the whole pipeline. Nothing here is a real patient
record — every name, number, and address is invented, and the type is a generic
sans-serif that no handwriting sample can stand in for.
"""

from pathlib import Path

import cv2
import numpy as np

FONT = cv2.FONT_HERSHEY_SIMPLEX
THICKNESS = 2
HERE = Path(__file__).resolve().parent
LAYOUTS = HERE / "layouts"
PHOTOS = HERE / "photos"


def _card(rows: list[tuple[str, float]], width: int = 900) -> np.ndarray:
    image = np.full((70 * len(rows) + 60, width, 3), 255, np.uint8)
    y = 50
    for text, scale in rows:
        cv2.putText(image, text, (40, y), FONT, scale, (0, 0, 0), THICKNESS, cv2.LINE_AA)
        y += 70
    return image


def _write(folder: Path, name: str, image: np.ndarray) -> None:
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / name
    if not cv2.imwrite(str(path), image):
        raise RuntimeError(f"could not write {path}")
    print(f"wrote {path.relative_to(HERE)} ({image.shape[1]}x{image.shape[0]})")


def printed_card() -> np.ndarray:
    """A clean scan: every field on its own labelled row."""
    return _card(
        [
            ("KARTU PENGOBATAN TB", 0.55),
            ("Nama Pasien: Siti Aminah", 0.7),
            ("No. RM : 00 12 34 56", 0.7),
            ("Regimen: HRZE", 0.7),
            ("Dosis Harian : 4 tablet", 0.7),
            ("Tanggal Mulai: 03/04/2026", 0.7),
            ("Tanggal Selesai: 03/10/2026", 0.7),
        ]
    )


def two_column_card() -> np.ndarray:
    """A form layout: one visual row carries two label/value pairs."""
    return _card(
        [
            ("KARTU PENGOBATAN TB", 0.55),
            ("Nama Pasien : Siti Aminah         Regimen : HRZE", 0.6),
            ("Alamat : Jl. Merdeka 12          Dosis : 4 tablet", 0.6),
            ("Tanggal Mulai : 03/04/2026       Tanggal Selesai : 03/10/2026", 0.6),
        ]
    )


def unlabelled_card() -> np.ndarray:
    """A form filled in by hand, where no colon was ever printed."""
    return _card(
        [
            ("KARTU PENGOBATAN TB", 0.55),
            ("Nama Pasien  Siti Aminah", 0.7),
            ("Regimen  HRZE", 0.7),
            ("Kuota obat  4", 0.7),
            ("Tanggal mulai  03-04-2026", 0.7),
        ]
    )


def photographed_card() -> np.ndarray:
    """A phone photo: 6 degrees off, shadowed, underexposed, and JPEG'd.

    Deliberately within what a phone actually produces — a real capture of a
    card is a few degrees off with a hand shadow across it. Degradation past
    that is not a harder card, it is an image the engine cannot read, and the
    draft is meant to show that through low per-field confidence instead.
    """
    image = printed_card()
    height, width = image.shape[:2]
    matrix = cv2.getRotationMatrix2D((width / 2, height / 2), 6.0, 1.0)
    image = cv2.warpAffine(image, matrix, (width, height), borderValue=250)
    image = cv2.GaussianBlur(image, (3, 3), 0)
    # A shadow falling across the lower half of the card, as under a hand.
    shadow = np.linspace(255, 130, height, dtype=np.float32)[:, None, None] / 255.0
    image = np.clip(image.astype(np.float32) * shadow, 0, 255).astype(np.uint8)
    image = cv2.resize(image, None, fx=0.5, fy=0.5, interpolation=cv2.INTER_AREA)
    image = cv2.convertScaleAbs(image, alpha=0.85, beta=0)
    _, encoded = cv2.imencode(".jpg", image, [cv2.IMWRITE_JPEG_QUALITY, 60])
    return cv2.imdecode(encoded, cv2.IMREAD_COLOR)


def main() -> None:
    _write(LAYOUTS, "card-printed.png", printed_card())
    _write(LAYOUTS, "card-two-column.png", two_column_card())
    _write(LAYOUTS, "card-unlabelled.png", unlabelled_card())
    _write(PHOTOS, "card-photographed.png", photographed_card())


if __name__ == "__main__":
    main()