"""Does a smaller rec/det model keep the fields correct while cutting latency?

Compares the current ``small`` det+rec against ``tiny`` and against
``small det + tiny rec`` on the same images, scoring each against the
field values PP-OCRv6 small produces (the current production behaviour).
A faster model that changes answers is not an improvement.

Run from app/ai-service:  .venv/bin/python scripts/bench_ocr_model_size.py
"""

from __future__ import annotations

import json
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
BLOBS = {p: p.read_bytes() for p in IMAGES}

FIELDS = ("patientName", "regimenCode", "dailyPillQuota", "startDate", "targetEndDate")


def build(det: ModelType, rec: ModelType) -> RapidOCR:
    params: dict[str, object] = dict(ocr_service._engine_params())
    params["Det.model_type"] = det
    params["Rec.model_type"] = rec
    return RapidOCR(params=params)


def run(engine: RapidOCR, img: np.ndarray):
    result = engine(img)
    texts = getattr(result, "txts", None) or ()
    scores = getattr(result, "scores", None) or ()
    lines = []
    for i, text in enumerate(texts):
        if not isinstance(text, str) or not text.strip():
            continue
        raw = scores[i] if i < len(scores) else None
        lines.append(OcrLine(text.strip(), float(raw) if isinstance(raw, (int, float)) else 0.0))
    return parse_onboarding_lines(lines)


def fields(draft) -> dict[str, object]:
    return {f: getattr(draft, f, None) for f in FIELDS}


def main() -> None:
    variants = {
        "small/small (current)": (ModelType.SMALL, ModelType.SMALL),
        "small det + tiny rec": (ModelType.SMALL, ModelType.TINY),
        "tiny/tiny": (ModelType.TINY, ModelType.TINY),
    }

    engines: dict[str, RapidOCR] = {}
    for name, (det, rec) in variants.items():
        try:
            engines[name] = build(det, rec)
            print(f"built {name}")
        except Exception as exc:  # noqa: BLE001 - report, do not guess
            print(f"{name}: unavailable ({type(exc).__name__}: {str(exc)[:90]})")

    if not engines:
        sys.exit("no engine could be built")

    results: dict[str, dict[str, object]] = {}
    timings: dict[str, list[float]] = {k: [] for k in engines}

    for p, b in BLOBS.items():
        img = cv2.imdecode(np.frombuffer(b, np.uint8), cv2.IMREAD_COLOR)
        if img is None:
            continue
        for name, engine in engines.items():
            try:
                engine(img)  # warm
                ts = []
                draft = None
                for _ in range(3):
                    t0 = time.perf_counter()
                    draft = run(engine, img)
                    ts.append((time.perf_counter() - t0) * 1000.0)
                timings[name].append(statistics.median(ts))
                results.setdefault(name, {})[p.name] = fields(draft)
            except Exception as exc:  # noqa: BLE001
                print(f"{name} on {p.name}: FAILED {type(exc).__name__}: {str(exc)[:90]}")
                results.setdefault(name, {})[p.name] = {}

    base_name = "small/small (current)"
    baseline = results.get(base_name, {})

    print("\n--- latency ---")
    for name, ts in timings.items():
        if ts:
            print(
                f"  {name:26s} median {statistics.median(ts):8.1f} ms  "
                f"total {sum(ts):8.1f} ms  worst {max(ts):8.1f} ms"
            )

    print("\n--- field agreement vs current (small/small) ---")
    for name, per_image in results.items():
        if name == base_name:
            continue
        same = diff = 0
        diffs: list[str] = []
        for img_name, got in per_image.items():
            want = baseline.get(img_name, {})
            for f in FIELDS:
                if got.get(f) == want.get(f):
                    same += 1
                else:
                    diff += 1
                    diffs.append(f"{img_name}.{f}: {want.get(f)!r} -> {got.get(f)!r}")
        total = same + diff
        if total:
            print(f"  {name:26s} {same}/{total} identical ({same/total*100:.0f}%)")
            for d in diffs[:6]:
                print(f"      {d}")

    Path("ocr_model_size_bench.json").write_text(
        json.dumps(results, indent=2, default=str), encoding="utf-8"
    )
    print("\nwrote ocr_model_size_bench.json")


if __name__ == "__main__":
    main()
