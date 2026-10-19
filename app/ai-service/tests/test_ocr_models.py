"""The OCR weights must be staged and verified, never fetched at runtime.

RapidOCR downloads ~30 MB from ModelScope the moment it cannot find a weight
file. That was confirmed by pointing it at an empty directory: it fetched all
three models and carried on. In production this makes the cold start depend on
a third-party host and lets an unverified file load silently — and "silently" is
the dangerous part, because OCR output stays plausible whatever it read.

These tests run against the local cache only and never touch the network.
"""

import hashlib
import json

import pytest

from onboarding_ocr.ocr_service import (
    MODEL_LOCK,
    OcrModelError,
    locked_models,
    model_dir,
    verify_models,
)

MODELS = locked_models()


def test_the_lock_covers_every_model_the_engine_loads():
    names = {model.name for model in MODELS}
    assert names == {
        "PP-OCRv6_det_small.onnx",
        "PP-OCRv6_rec_small.onnx",
        "ch_ppocr_mobile_v2.0_cls_mobile.onnx",
    }


def test_the_lock_records_a_full_sha256_for_each_model():
    lock = json.loads(MODEL_LOCK.read_text(encoding="utf-8"))
    for model in MODELS:
        assert len(lock["models"][model.name]) == 64


def test_the_local_cache_matches_the_lock():
    """Skip rather than pass when the weights are not staged on this machine."""
    root = model_dir()
    missing = [m.name for m in MODELS if not (root / m.name).is_file()]
    if missing:
        pytest.skip(f"weights not staged at {root}: {missing}")
    verify_models()


def test_a_missing_weight_raises_instead_of_downloading(tmp_path, monkeypatch):
    monkeypatch.setenv("TIBY_OCR_MODEL_DIR", str(tmp_path))
    with pytest.raises(OcrModelError, match="missing"):
        verify_models()
    # The point of the check: nothing was fetched to satisfy it.
    assert list(tmp_path.iterdir()) == []


def test_a_tampered_weight_is_refused(tmp_path, monkeypatch):
    monkeypatch.setenv("TIBY_OCR_MODEL_DIR", str(tmp_path))
    for model in MODELS:
        (tmp_path / model.name).write_bytes(b"not the weights you are looking for")
    with pytest.raises(OcrModelError, match="does not match"):
        verify_models()


def test_one_bad_weight_out_of_three_is_enough_to_stop_everything(tmp_path, monkeypatch):
    root = model_dir()
    if not all((root / m.name).is_file() for m in MODELS):
        pytest.skip("weights not staged locally")
    monkeypatch.setenv("TIBY_OCR_MODEL_DIR", str(tmp_path))
    for model in MODELS[:-1]:
        (tmp_path / model.name).write_bytes((root / model.name).read_bytes())
    (tmp_path / MODELS[-1].name).write_bytes(b"wrong")
    with pytest.raises(OcrModelError, match=MODELS[-1].name):
        verify_models()


def test_the_model_dir_override_wins(tmp_path, monkeypatch):
    monkeypatch.setenv("TIBY_OCR_MODEL_DIR", str(tmp_path))
    assert model_dir() == tmp_path


def test_a_correctly_staged_directory_verifies(tmp_path, monkeypatch):
    root = model_dir()
    if not all((root / m.name).is_file() for m in MODELS):
        pytest.skip("weights not staged locally")
    monkeypatch.setenv("TIBY_OCR_MODEL_DIR", str(tmp_path))
    for model in MODELS:
        (tmp_path / model.name).write_bytes((root / model.name).read_bytes())
    verify_models()
    for model in MODELS:
        assert hashlib.sha256((tmp_path / model.name).read_bytes()).hexdigest() == model.sha256