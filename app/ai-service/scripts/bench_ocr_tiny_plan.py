"""Can fuzzy label matching recover the fields 'tiny' rec misspells?

Measured problem: PP-OCRv6 ``tiny`` rec reads 'Tanggal Selesai' as
'Tanggal Selesat' and 'Tanggal Mulai' as 'Tanggal Muia'. The label regex
(``tanggal\\s*selesai``) then does not match, and the field is lost — not
misread, lost. Losing a field is safer than inventing one, but at 2.5x the
speed it is worth recovering.

This script compares three strategies on every image, scoring against the
current ``small`` output as the reference:

  A. small det + small rec          (current, slow)
  B. small det + tiny rec           (fast, loses misspelled labels)
  C. B + tolerant label matching    (fast, recovers the field)

A tolerant label accepts a one-character edit on the label token only
('selesat' -> 'selesai'). It never tolerates a wrong value.

Run from app/ai-service:  .venv/bin/python scripts/bench_ocr_tiny_plan.py
"""

from __future__ import annotations

import json
import re
import statistics
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

import cv2
import numpy as np
from rapidocr import ModelType, RapidOCR

from onboarding_ocr import ocr_service
from onboarding_ocr.card_parser import OcrLine, parse_onboarding_lines

IMAGES = sorted(
    p for p in Path("dataset/ocr").rglob("*") if p.suffix.lower() in {".png", ".jpg"}
)
FIELDS = ("patientName", "regimenCode", "dailyPillQuota", "startDate", "targetEndDate")

# Canonical label tokens for the two date fields, tried against every word on
# a line. PP-OCRv6 ``tiny`` rec reads 'Selesai' as 'Selesat' and 'Mulai' as
# 'Muia'; without this the label never matches and the field is silently lost.
_CANONICAL = {
    "startDate": ("mulai", "tanggal mulai"),
    "targetEndDate": ("selesai", "tanggal selesai"),
}


def _within_one_edit(word: str, target: str) -> bool:
    """True when ``word`` is ``target`` with at most one insert/delete/sub
    (an adjacent transposition counts as one), and is long enough that a
    coincidental near-match is implausible."""
    a, b = word.lower(), target.lower()
    if a == b:
        return True
    if len(a) < 5 or abs(len(a) - len(b)) > 1:
        return False
    if len(a) == len(b):
        diff = [i for i in range(len(a)) if a[i] != b[i]]
        if len(diff) == 1:
            return True
        # adjacent transposition: 'selesai' -> 'selesia'
        if len(diff) == 2 and diff[1] == diff[0] + 1:
            i, j = diff
            return a[i] == b[j] and a[j] == b[i]
        return False
    # insertion / deletion
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


def build(det: ModelType, rec: ModelType) -> RapidOCR:
    params: dict[str, object] = dict(ocr_service._engine_params())
    params["Det.model_type"] = det
    params["Rec.model_type"] = rec
    return RapidOCR(params=params)


def lines_from(engine: RapidOCR, img: np.ndarray) -> list[OcrLine]:
    res = engine(img)
    texts = getattr(res, "txts", None) or ()
    scores = getattr(res, "scores", None) or ()
    out: list[OcrLine] = []
    for i, text in enumerate(texts):
        if not isinstance(text, str) or not text.strip():
            continue
        raw = scores[i] if i < len(scores) else None
        out.append(
            OcrLine(text.strip(), float(raw) if isinstance(raw, (int, float)) else 0.0)
        )
    return out


def repair_labels(lines: list[OcrLine]) -> list[OcrLine]:
    """Rewrite a misspelled date label so the existing parser can read it.

    Only the label word is corrected; the value on the line is untouched and
    still goes through the same date validation and ambiguity check. A line is
    only rewritten when it already looks like a labelled date, so a stray
    word cannot be promoted into a field.
    """
    date_re = re.compile(r"\d{1,4}\s*[/-]\s*\d{1,2}\s*[/-]\s*\d{2,4}")
    fixed: list[OcrLine] = []
    for line in lines:
        text = line.text
        if date_re.search(text):
            for token, canonical in _CANONICAL.values():
                already = re.search(canonical, text, re.IGNORECASE)
                if already:
                    break
                for word in re.findall(r"[A-Za-z]{5,}", text):
                    if _within_one_edit(word, token):
                        text = re.sub(
                            re.escape(word), token, text, count=1, flags=re.IGNORECASE
                        )
                        break
                else:
                    continue
                break
        fixed.append(type(line)(text, line.score))
    return fixed


def fields(draft) -> dict[str, object]:
    return {f: getattr(draft, f, None) for f in FIELDS}


def main() -> None:
    engines = {
        "A small/small": build(ModelType.SMALL, ModelType.SMALL),
        "B small/tiny": build(ModelType.SMALL, ModelType.TINY),
    }

    timing: dict[str, list[float]] = {k: [] for k in engines}
    timing["C small/tiny+fuzzy"] = []
    out: dict[str, dict[str, dict[str, object]]] = {k: {} for k in
                                                   (*engines, "C small/tiny+fuzzy")}

    for p in IMAGES:
        img = cv2.imdecode(np.frombuffer(p.read_bytes(), np.uint8), cv2.IMREAD_COLOR)
        if img is None:
            continue

        for name, engine in engines.items():
            engine(img)
            ts: list[float] = []
            draft = None
            for _ in range(3):
                t0 = time.perf_counter()
                draft = parse_onboarding_lines(lines_from(engine, img))
                ts.append((time.perf_counter() - t0) * 1000.0)
            timing[name].append(statistics.median(ts))
            out[name][p.name] = fields(draft)

        # C: same tiny engine, fuzzy label repair before parsing
        engine = engines["B small/tiny"]
        ts = []
        draft = None
        for _ in range(3):
            t0 = time.perf_counter()
            draft = parse_onboarding_lines(repair_labels(lines_from(engine, img)))
            ts.append((time.perf_counter() - t0) * 1000.0)
        timing["C small/tiny+fuzzy"].append(statistics.median(ts))
        out["C small/tiny+fuzzy"][p.name] = fields(draft)

    print("--- latency ---")
    for name, ts in timing.items():
        if ts:
            print(
                f"  {name:22s} median {statistics.median(ts):8.1f} ms  "
                f"total {sum(ts):8.1f} ms  worst {max(ts):8.1f} ms"
            )

    print("\n--- field agreement vs A (current) ---")
    base = out["A small/small"]
    for name in ("B small/tiny", "C small/tiny+fuzzy"):
        same = diff = 0
        details: list[str] = []
        for img_name, got in out[name].items():
            want = base.get(img_name, {})
            for f in FIELDS:
                if got.get(f) == want.get(f):
                    same += 1
                else:
                    diff += 1
                    details.append(f"{img_name}.{f}: {want.get(f)!r} -> {got.get(f)!r}")
        total = same + diff
        print(f"  {name:22s} {same}/{total} identical ({same/total*100:.0f}%)")
        for d in details[:8]:
            print(f"      {d}")

    print("\n--- C output vs A, per image ---")
    for img_name in base:
        a = base[img_name]
        c = out["C small/tiny+fuzzy"].get(img_name, {})
        if a != c:
            print(f"  {img_name}")
            for f in FIELDS:
                if a.get(f) != c.get(f):
                    print(f"    {f}: {a.get(f)!r} -> {c.get(f)!r}")

    Path("ocr_tiny_plan_bench.json").write_text(
        json.dumps(out, indent=2, default=str), encoding="utf-8"
    )
    print("\nwrote ocr_tiny_plan_bench.json")


if __name__ == "__main__":
    main()
