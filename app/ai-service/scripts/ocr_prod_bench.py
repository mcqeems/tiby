"""Load-test the full app OCR chain from the machine that actually serves it.

Run this ON the production host (the Celeron mini PC), not on a dev laptop.
It measures, separately and end to end:

  1. multipart upload over the wire  (browser -> backend)
  2. backend -> AI service forward   (incl. the AbortSignal timeout)
  3. AI service OCR itself
  4. what the caller finally receives (HTTP status + body shape)

The last one matters most: the backend swallows a slow or failed AI call and
returns a canned draft with confidence >= 0.8. If OCR takes longer than the
forward timeout, the endpoint still answers 200 with fake data. This script
detects that, because a fast wrong answer is worse than a slow right one.

Usage, with both services already running on this host:

    python3 scripts/ocr_prod_bench.py \
        --backend http://127.0.0.1:3001 \
        --ai      http://127.0.0.1:8000 \
        --image   dataset/ocr/photos/card-synthetic.png

Authentication is required by the backend (NAKES role). Supply a session
cookie or bearer token with --cookie / --token; without it the script only
benchmarks the AI service directly and says so.
"""

from __future__ import annotations

import argparse
import json
import statistics
import sys
import time
from pathlib import Path

try:
    import httpx
except ImportError:
    sys.exit("httpx is required: uv pip install httpx (it is a dev dependency)")

# The canned fallback in onboarding.service.ts, byte for byte. If the response
# matches this, the caller got fake data and the timing means nothing.
FALLBACK_MARKERS = {
    "regimenCode": "FDC-4",
    "dailyPillQuota": 4,
    "confidence": 0.85,
}


def looks_like_fallback(body: object) -> bool:
    if not isinstance(body, dict):
        return False
    raw = str(body.get("rawText", ""))
    return (
        body.get("patientName") is None
        and body.get("regimenCode") == FALLBACK_MARKERS["regimenCode"]
        and body.get("dailyPillQuota") == FALLBACK_MARKERS["dailyPillQuota"]
        and raw.startswith("Scanned file:")
    )


def timeit(fn, runs: int) -> tuple[float, float, float, list[object]]:
    times: list[float] = []
    results: list[object] = []
    for _ in range(runs):
        t0 = time.perf_counter()
        out = fn()
        times.append((time.perf_counter() - t0) * 1000.0)
        results.append(out)
    return (
        statistics.median(times),
        min(times),
        max(times),
        results,
    )


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--backend", default="http://127.0.0.1:3001")
    ap.add_argument("--ai", default="http://127.0.0.1:8000")
    ap.add_argument("--image", action="append", default=None)
    ap.add_argument("--runs", type=int, default=5)
    ap.add_argument("--cookie", default=None, help="Session cookie for NAKES auth")
    ap.add_argument("--token", default=None, help="Bearer token for NAKES auth")
    ap.add_argument(
        "--timeout", type=float, default=120.0, help="Client read timeout (s)"
    )
    args = ap.parse_args()

    images = (
        [Path(p) for p in args.image]
        if args.image
        else sorted(
            p
            for p in Path("dataset/ocr").rglob("*")
            if p.suffix.lower() in {".png", ".jpg"}
        )
    )
    if not images:
        sys.exit("no images found")

    ai_url = f"{args.ai.rstrip('/')}/ocr/extract"
    be_url = f"{args.backend.rstrip('/')}/api/faskes/onboarding/ocr"

    headers: dict[str, str] = {}
    if args.cookie:
        headers["Cookie"] = args.cookie
    if args.token:
        headers["Authorization"] = f"Bearer {args.token}"

    print(f"AI service : {ai_url}")
    print(f"Backend    : {be_url}  (auth: {'yes' if headers else 'NO — backend skipped'})")
    print(f"runs/image : {args.runs}\n")

    code = Path("ocr_prod_bench.json")
    report: list[dict[str, object]] = []

    with httpx.Client(timeout=args.timeout) as client:
        # ---- AI service direct: the OCR floor -----------------------------
        print("=== AI service direct (floor: real OCR time on this host) ===")
        head = f"{'image':28s} {'MB':>6s} {'median':>9s} {'min':>9s} {'max':>9s} {'status':>7s}"
        print(head)
        print("-" * len(head))
        ai_times: dict[str, float] = {}
        for p in images:
            data = p.read_bytes()

            def call(d=data, n=p.name):
                r = client.post(
                    ai_url, files={"cardImage": (n, d, "image/png")}, timeout=args.timeout
                )
                return r.status_code, r.text

            med, lo, hi, out = timeit(call, args.runs)
            status = out[0][0]
            ai_times[p.name] = med
            print(
                f"{p.name:28s} {len(data)/1024/1024:5.1f}M {med:8.1f}ms "
                f"{lo:8.1f}ms {hi:8.1f}ms {status:7d}"
            )
            report.append(
                {"stage": "ai_direct", "image": p.name, "median_ms": med,
                 "min_ms": lo, "max_ms": hi, "status": status}
            )

        # ---- backend forward: the real app path ---------------------------
        if not headers:
            print(
                "\n(no --cookie/--token given, so the backend hop is not measured.)\n"
                "Get a session cookie from the browser after logging in as NAKES,\n"
                "then re-run with --cookie 'better-auth.session_token=...'."
            )
        else:
            print("\n=== backend -> AI service (real app path) ===")
            print(head + "  fallback?")
            print("-" * (len(head) + 11))
            for p in images:
                data = p.read_bytes()

                def call(d=data, n=p.name):
                    r = client.post(
                        be_url,
                        files={"cardImage": (n, d, "image/png")},
                        headers=headers,
                        timeout=args.timeout,
                    )
                    try:
                        body = r.json()
                    except json.JSONDecodeError:
                        body = r.text
                    return r.status_code, body

                med, lo, hi, out = timeit(call, args.runs)
                status, body = out[0]
                fake = looks_like_fallback(body)
                flag = "FALLBACK" if fake else ""
                print(
                    f"{p.name:28s} {len(data)/1024/1024:5.1f}M {med:8.1f}ms "
                    f"{lo:8.1f}ms {hi:8.1f}ms {status:7d}  {flag}"
                )
                report.append(
                    {"stage": "backend", "image": p.name, "median_ms": med,
                     "min_ms": lo, "max_ms": hi, "status": status,
                     "fallback": fake}
                )

            # ------------------------------------------------------------------
            ai_med = statistics.median(ai_times.values()) if ai_times else 0.0
            be_med = statistics.median(
                r["median_ms"] for r in report if r["stage"] == "backend"
            ) if any(r["stage"] == "backend" for r in report) else 0.0
            if ai_med and be_med:
                print(
                    f"\nbackend overhead over direct AI call: "
                    f"{be_med - ai_med:+.1f} ms "
                    f"(backend {be_med:.0f} ms vs AI {ai_med:.0f} ms)"
                )
            if any(r.get("fallback") for r in report):
                print(
                    "\n!! At least one response was the canned FALLBACK draft, not OCR.\n"
                    "   The timing is meaningless and the caller got fake data.\n"
                    "   Likely cause: AbortSignal.timeout(5000) in\n"
                    "   app/backend/src/modules/onboarding/services/onboarding.service.ts\n"
                    "   fired before OCR finished."
                )

    code.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"\nwrote {code}")

    # The decision this script exists to support.
    worst = max(ai_times.values()) if ai_times else 0.0
    print(f"\nworst direct-AI median: {worst/1000:.2f} s  (target: < 5.00 s)")
    print("PASS" if worst < 5000 else "FAIL — see the thread/CPU notes in README")


if __name__ == "__main__":
    main()
