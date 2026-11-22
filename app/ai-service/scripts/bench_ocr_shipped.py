"""End-to-end proof for the tiny-rec change, through the real entry point.

Runs ``extract_onboarding_card`` — the function the HTTP route actually calls —
and records latency plus every draft field, so the claim "2.5x faster with the
same fields" is checked on the shipped code path, not a bench harness with its
own engine.

    .venv/bin/python scripts/bench_ocr_shipped.py            # current code
    .venv/bin/python scripts/bench_ocr_shipped.py --json out.json

Compare two runs by diffing the JSON.
"""

from __future__ import annotations

import argparse
import json
import statistics
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from onboarding_ocr.ocr_service import _engine, extract_onboarding_card

FIELDS = ("patientName", "regimenCode", "dailyPillQuota", "startDate", "targetEndDate")
IMAGES = sorted(
    p for p in Path("dataset/ocr").rglob("*") if p.suffix.lower() in {".png", ".jpg"}
)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--runs", type=int, default=5)
    ap.add_argument("--json", default=None)
    args = ap.parse_args()

    _engine()  # warm the ONNX sessions; cold load is not what we are measuring

    rows = []
    for p in IMAGES:
        data = p.read_bytes()
        times = []
        draft = None
        for _ in range(args.runs):
            t0 = time.perf_counter()
            draft = extract_onboarding_card(data)
            times.append((time.perf_counter() - t0) * 1000.0)
        med = statistics.median(times)
        fields = {f: getattr(draft, f, None) for f in FIELDS}
        rows.append(
            {
                "image": p.name,
                "kb": round(len(data) / 1024),
                "median_ms": round(med, 1),
                "min_ms": round(min(times), 1),
                "max_ms": round(max(times), 1),
                "confidence": round(draft.confidence, 3),
                "fields": fields,
            }
        )
        print(
            f"{p.name:28s} {rows[-1]['kb']:5d}K {med:8.1f} ms  conf={draft.confidence:.2f}  "
            f"{fields['patientName']!r} {fields['regimenCode']!r} "
            f"{fields['startDate']} / {fields['targetEndDate']}"
        )

    total = sum(r["median_ms"] for r in rows)
    worst = max(r["median_ms"] for r in rows)
    print(f"\ntotal {total:8.1f} ms   worst {worst:8.1f} ms")

    if args.json:
        Path(args.json).write_text(json.dumps(rows, indent=2), encoding="utf-8")
        print(f"wrote {args.json}")


if __name__ == "__main__":
    main()
