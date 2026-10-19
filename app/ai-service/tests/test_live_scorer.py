"""Unit tests for the live runner's scoring logic.

The scorer is only exercised end to end by real API calls, which makes it the
part of `test_live_providers.py` most likely to be wrong and least likely to be
noticed. It was wrong: reading a fixture expectation of `[]` as a set of
acceptable answers scored every correct symptom list as a mismatch, and a field
counter was divided by case count instead of run count, reporting 300%. Neither
showed up until a live run was read closely.

The script is loaded by path because ``scripts/`` is not an importable package.
"""

import importlib.util
import sys
from pathlib import Path

import pytest

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "test_live_providers.py"


def load():
    spec = importlib.util.spec_from_file_location("tiby_live_runner", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


runner = load()


@pytest.mark.parametrize(
    ("want", "got", "expected"),
    [
        ("SUDAH_MINUM", "SUDAH_MINUM", True),
        ("SUDAH_MINUM", "BELUM_MINUM", False),
        (None, None, True),
        (0, None, False),
        ([], [], True),
        (["MUAL_RINGAN"], ["MUAL_RINGAN"], True),
        (["MUAL_RINGAN"], [], False),
        (["MUAL_RINGAN"], ["BATUK_DARAH"], False),
        ({"any_of": [0, None]}, 0, True),
        ({"any_of": [0, None]}, None, True),
        ({"any_of": [0, None]}, 4, False),
    ],
)
def test_accepted(want, got, expected):
    assert runner.accepted(want, got) is expected


def test_an_empty_symptom_list_is_not_read_as_a_set_of_alternatives():
    """The bug this file exists for."""
    assert runner.accepted([], []) is True
    assert runner.accepted(["MUAL_RINGAN"], ["MUAL_RINGAN"]) is True


def test_report_counts_failures_and_instability_separately():
    report = runner.Report()
    report.add("a")
    report.add("b", None)
    report.add("c", False)
    report.add("d", True)
    assert report.failed == 1
    assert report.unstable == 1
    assert "FAIL" in report.render()
    assert "UNSTABLE" in report.render()
    assert "PASS" in report.render()


def test_preflight_rejects_the_offline_baseline(monkeypatch):
    monkeypatch.setenv("TIBY_EXTRACTOR", "rules")
    assert runner.preflight() is not None


def test_preflight_rejects_a_missing_token(monkeypatch):
    monkeypatch.delenv("TIBY_EXTRACTOR", raising=False)
    monkeypatch.delenv("NARAROUTER_API_TOKEN", raising=False)
    monkeypatch.delenv("NARAROUTER_API_KEY", raising=False)
    assert runner.preflight() is not None


def test_every_fixture_expectation_is_scorable():
    """A fixture shape the scorer cannot compare would silently fail everything."""
    cases = (runner.FIXTURES / "extraction" / "cases.jsonl").read_text(encoding="utf-8")
    assert cases.strip(), "no extraction cases"
    for line in cases.splitlines():
        if not line.strip():
            continue
        import json

        case = json.loads(line)
        assert case["id"] and case["transcript"]
        for field in runner.SCORED_FIELDS:
            want = case["expect"][field]
            if isinstance(want, dict):
                assert set(want) == {runner.ANY_OF}, f"{case['id']}.{field}"
            else:
                assert runner.accepted(want, want), f"{case['id']}.{field} never matches itself"