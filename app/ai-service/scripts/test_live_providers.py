"""Run every provider-backed path against the real providers and score the result.

This is the command that answers "is the AI actually working right now, does it
error, and how accurate is it". It exercises the HTTP surface — routes, status
codes, and the ``ApiError`` envelope included — rather than calling helpers
directly, so a broken route fails here the same way it would fail for the
backend.

Refuses to run in ``TIBY_EXTRACTOR=rules`` mode. Passing checks in that mode
mean nothing: the keyword baseline would happily agree with the fixtures while
the model was broken. That is the exact confusion this script exists to remove.

Usage, with provider credentials exported::

    uv run python scripts/test_live_providers.py                # everything
    uv run python scripts/test_live_providers.py --only extraction --repeat 3
    uv run python scripts/test_live_providers.py --list

Extraction is not deterministic, so a single run per case is not a measurement.
``--repeat`` runs each case N times and reports a case that is right only
sometimes as ``UNSTABLE`` — a different problem from ``FAIL``, which means the
model never got it right. Runs from any working directory. Costs real API
calls. Exits non-zero only on a hard failure, so it is usable as a deploy gate.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from fastapi.testclient import TestClient

from tiby_ai.guidance.safety import detect_action_request
from tiby_ai.main import app

ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / "tests" / "fixtures"
DATASET = ROOT / "dataset"
OCR_CARD = DATASET / "ocr" / "layouts" / "card-printed.png"
AUDIO_SAMPLE = FIXTURES / "audio" / "check-in-sample-01.wav"
SCORED_FIELDS = ("medicationTaken", "pillsTakenCount", "symptoms", "intentToStopOrRefuse")


class Report:
    """Collects results so every group runs even after one fails."""

    def __init__(self) -> None:
        self.rows: list[tuple[str, bool | None, str]] = []

    def add(self, name: str, ok: bool | None = True, detail: str = "") -> None:
        """``None`` means unstable: right sometimes, wrong sometimes."""
        self.rows.append((name, ok, detail))

    @property
    def failed(self) -> int:
        return sum(1 for _, ok, _ in self.rows if ok is False)

    @property
    def unstable(self) -> int:
        return sum(1 for _, ok, _ in self.rows if ok is None)

    def render(self) -> str:
        width = max((len(name) for name, _, _ in self.rows), default=10)
        mark = {True: "PASS", False: "FAIL", None: "UNSTABLE"}
        lines = [
            f"  {mark[ok]:<8}  {name:<{width}}  {detail}".rstrip()
            for name, ok, detail in self.rows
        ]
        return "\n".join(lines)


def preflight() -> str | None:
    """Return a reason to stop, or ``None`` when a live run is legitimate."""
    import os

    if os.getenv("TIBY_EXTRACTOR", "agnes").lower() == "rules":
        return (
            "TIBY_EXTRACTOR=rules is the offline keyword baseline. Unset it — "
            "a green run against rules mode says nothing about the model."
        )
    if not (os.getenv("NARAROUTER_API_TOKEN") or os.getenv("NARAROUTER_API_KEY")):
        return "NARAROUTER_API_TOKEN (or NARAROUTER_API_KEY) is not set."
    if not os.getenv("NARAROUTER_BASE_URL"):
        return "NARAROUTER_BASE_URL is not set."
    return None


def check_ocr(client: TestClient, report: Report) -> None:
    """Local OCR: no provider, so this one only fails on a code regression."""
    if not OCR_CARD.is_file():
        report.add("ocr / draft", False, f"missing fixture {OCR_CARD}")
        return
    with OCR_CARD.open("rb") as card:
        response = client.post(
            "/ocr/extract", files={"cardImage": ("card.png", card, "image/png")}
        )
    if response.status_code != 200:
        report.add("ocr / draft", False, f"HTTP {response.status_code}")
        return
    body = response.json()
    if body.get("patientName") != "Siti Aminah" or body.get("dailyPillQuota") != 4:
        report.add("ocr / draft", False, json.dumps(body.get("fieldConfidence")))
        return
    report.add(
        "ocr / draft",
        True,
        f"name+quota read, confidence {body['confidence']:.2f}, "
        f"{len(body['uncertainties'])} flagged",
    )


ANY_OF = "any_of"
"""Fixture marker for a field with several equally acceptable answers.

An explicit wrapper rather than a bare list, because ``symptoms`` is itself a
list: reading a list expectation as a set of alternatives silently scored every
correct symptom list as a mismatch.
"""


def accepted(want: object, got: object) -> bool:
    """``True`` when the response field matches what the fixture expects."""
    if isinstance(want, dict) and ANY_OF in want:
        return any(got == option for option in want[ANY_OF])
    return got == want


def check_text_extraction(client: TestClient, report: Report, repeat: int = 1) -> dict[str, int]:
    """Score the real LLM against the extraction fixtures, field by field.

    The model is not deterministic, so one run per case is not a measurement.
    With ``repeat`` above 1 a case that is sometimes right reports as
    ``UNSTABLE`` rather than ``FAIL`` — a different problem, and one worth
    looking at, but not a regression.
    """
    path = FIXTURES / "extraction" / "cases.jsonl"
    if not path.is_file():
        report.add("extraction / text", False, f"missing fixture {path}")
        return {}

    hits = {field: 0 for field in SCORED_FIELDS}
    runs = 0
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        case = json.loads(line)
        outcomes: list[bool] = []
        mismatches: set[str] = set()
        for _ in range(repeat):
            runs += 1
            response = client.post(
                "/ai/extractions/check-in", json={"transcript": case["transcript"]}
            )
            if response.status_code != 200:
                report.add(f"extraction / {case['id']}", False, f"HTTP {response.status_code}")
                break
            body = response.json()
            outcomes.append(
                all(
                    accepted(want, body.get(field))
                    for field, want in case["expect"].items()
                    if field in SCORED_FIELDS
                )
            )
            for field, want in case["expect"].items():
                if field not in SCORED_FIELDS:
                    continue
                if accepted(want, body.get(field)):
                    hits[field] += 1
                else:
                    mismatches.add(f"{field}: got {body.get(field)!r} want {want!r}")
        else:
            correct = sum(outcomes)
            if correct == len(outcomes):
                report.add(f"extraction / {case['id']}")
            elif correct:
                report.add(
                    f"extraction / {case['id']}",
                    None,
                    f"UNSTABLE {correct}/{len(outcomes)} runs; {'; '.join(sorted(mismatches))}",
                )
            else:
                report.add(f"extraction / {case['id']}", False, "; ".join(sorted(mismatches)))
    return {field: round(100 * hits[field] / runs) for field in SCORED_FIELDS} if runs else {}


def check_audio_extraction(client: TestClient, report: Report) -> None:
    """Real speech-to-text plus the same extraction, end to end."""
    if not AUDIO_SAMPLE.is_file():
        report.add("extraction / audio", False, f"missing fixture {AUDIO_SAMPLE}")
        return
    with AUDIO_SAMPLE.open("rb") as audio:
        response = client.post(
            "/ai/extractions/check-in/audio", files={"audio": ("check-in.wav", audio, "audio/wav")}
        )
    if response.status_code != 200:
        report.add("extraction / audio", False, f"HTTP {response.status_code}")
        return
    body = response.json()
    report.add(
        "extraction / audio",
        bool(body.get("transcription_provider")),
        f"{body.get('transcription_provider')}/{body.get('transcription_model')} -> "
        f"{body.get('medicationTaken')}, {body.get('pillsTakenCount')} pill",
    )


def check_health(client: TestClient, report: Report, repeat: int = 1) -> None:
    """Liveness: the cheapest signal that the app is mounted at all."""
    response = client.get("/ai/health")
    ok = response.status_code == 200 and response.json().get("status") == "ok"
    report.add("health / liveness", ok, "" if ok else f"HTTP {response.status_code}")


def check_guidance(client: TestClient, report: Report, repeat: int = 1) -> None:
    """Every guidance case, checked against its machine-readable expectations.

    Each case states what must hold: whether the local guard fires, whether the
    answer is grounded, whether it must be null, and how many citations it
    needs. A grounded answer with no citation is the failure worth catching —
    it would mean the model asserted something the retrieved evidence does not
    support.
    """
    path = FIXTURES / "guidance" / "guidance.jsonl"
    if not path.is_file():
        report.add("guidance / cases", False, f"missing fixture {path}")
        return

    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        case = json.loads(line)
        response = client.post("/ai/guidance", json={"question": case["question"]})
        if response.status_code != 200:
            report.add(f"guidance / {case['id']}", False, f"HTTP {response.status_code}")
            continue
        body = response.json()
        want = case["expect"]
        problems = []
        if bool(want["guard_triggered"]) != bool(case.get("guard", detect_action_request(case["question"]))):
            problems.append(f"guard={detect_action_request(case['question'])} want={want['guard_triggered']}")
        if body.get("grounded") != want["grounded"]:
            problems.append(f"grounded={body.get('grounded')} want {want['grounded']}")
        if (body.get("answer") is None) != want["answer_is_null"]:
            problems.append(
                f"answer={str(body.get('answer'))[:40]!r} want null={want['answer_is_null']}"
            )
        citations = len(body.get("citations") or [])
        if citations < want["min_citations"]:
            problems.append(f"citations={citations} want >={want['min_citations']}")
        if body.get("grounded") and citations == 0:
            problems.append("grounded with no citation")
        report.add(f"guidance / {case['id']}", not problems, "; ".join(problems))


GROUPS = {
    "health": check_health,
    "ocr": lambda client, report, repeat: check_ocr(client, report),
    "extraction": check_text_extraction,
    "audio": lambda client, report, repeat: check_audio_extraction(client, report),
    "guidance": check_guidance,
}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--only", choices=sorted(GROUPS), action="append", help="run one group (repeatable)"
    )
    parser.add_argument(
        "--repeat",
        type=int,
        default=1,
        help="run each extraction case N times to separate instability from being wrong",
    )
    parser.add_argument("--list", action="store_true", help="list the groups and exit")
    args = parser.parse_args()

    if args.list:
        print("\n".join(sorted(GROUPS)))
        return 0

    blocked = preflight()
    if blocked and not (args.only and set(args.only) <= {"ocr"}):
        print(f"SKIPPED: {blocked}\n")
        return 2

    selected = args.only or sorted(GROUPS)
    repeat = max(1, args.repeat)
    print(f"live provider check ({', '.join(selected)}" + (f", repeat={repeat}" if repeat > 1 else "") + ")\n")
    client = TestClient(app)
    report = Report()
    accuracy: dict[str, int] = {}
    for group in selected:
        result = GROUPS[group](client, report, repeat)
        if isinstance(result, dict):
            accuracy = result

    print(report.render())
    if accuracy:
        print("\n  extraction accuracy by field (%, across all runs):")
        for field, score in accuracy.items():
            print(f"    {field:<22} {score}")
    passed = len(report.rows) - report.failed - report.unstable
    print(
        f"\n  {passed} passed, {report.unstable} unstable, {report.failed} failed"
        f"  (of {len(report.rows)} checks)"
    )
    return 1 if report.failed else 0


if __name__ == "__main__":
    sys.exit(main())
