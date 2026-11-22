"""End-to-end latency probe for the app OCR path, not the model alone.

Measures the real chain:
  client multipart POST -> FastAPI /ocr/extract -> decode -> det/cls/rec -> JSON

Reports each phase separately so the OCR time can be told apart from HTTP,
multipart, serialization, and the upload itself.

This runs against a local AI service on THIS machine. It does not predict a
Celeron mini PC; run scripts/ocr_loadtest.py there for production numbers.

Run from app/ai-service:
    .venv/bin/python scripts/bench_ocr_endtoend.py
    .venv/bin/python scripts/bench_ocr_endtoend.py --url http://host:8000
"""

from __future__ import annotations

import argparse
import statistics
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

import cv2
import httpx
import numpy as np
import uvicorn

IMAGES = sorted(
    p for p in Path("dataset/ocr").rglob("*") if p.suffix.lower() in {".png", ".jpg"}
)


def start_server(port: int) -> uvicorn.Server:
    import threading

    sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
    config = uvicorn.Config("main:app", host="127.0.0.1", port=port, log_level="error")
    server = uvicorn.Server(config)
    threading.Thread(target=server.run, daemon=True).start()

    deadline = time.time() + 60
    while not server.started and time.time() < deadline:
        time.sleep(0.05)
    if not server.started:
        raise RuntimeError("AI service did not start")
    return server


def post_once(client: httpx.Client, url: str, p: Path) -> tuple[float, int]:
    data = p.read_bytes()
    t0 = time.perf_counter()
    res = client.post(
        url,
        files={"cardImage": (p.name, data, "image/png")},
        timeout=120.0,
    )
    return (time.perf_counter() - t0) * 1000.0, res.status_code


def local_ocr_ms(p: Path) -> float:
    """OCR on in-process bytes: no HTTP, no multipart, no upload."""
    from onboarding_ocr.ocr_service import extract_onboarding_card

    data = p.read_bytes()
    t0 = time.perf_counter()
    extract_onboarding_card(data)
    return (time.perf_counter() - t0) * 1000.0


def decode_ms(p: Path) -> float:
    data = p.read_bytes()
    t0 = time.perf_counter()
    cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    return (time.perf_counter() - t0) * 1000.0


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default=None, help="Existing AI service base URL")
    ap.add_argument("--port", type=int, default=8123)
    ap.add_argument("--runs", type=int, default=5)
    args = ap.parse_args()

    server = None
    base = args.url
    if base is None:
        server = start_server(args.port)
        base = f"http://127.0.0.1:{args.port}"
    url = f"{base.rstrip('/')}/ocr/extract"

    print(f"target: {url}")
    print(f"images: {len(IMAGES)}, runs per image: {args.runs}\n")

    hdr = (
        f"{'image':30s} {'size':>8s} {'decode':>8s} {'ocr(inproc)':>12s} "
        f"{'http_e2e':>10s} {'wire_overhead':>14s}"
    )
    print(hdr)
    print("-" * len(hdr))

    with httpx.Client() as client:
        # warm the engine so the first row is not a cold start
        post_once(client, url, IMAGES[0])

        for p in IMAGES:
            size_kb = p.stat().st_size / 1024
            dec = statistics.median([decode_ms(p) for _ in range(args.runs)])
            ocr = statistics.median([local_ocr_ms(p) for _ in range(args.runs)])

            codes = set()
            times = []
            for _ in range(args.runs):
                ms, code = post_once(client, url, p)
                times.append(ms)
                codes.add(code)
            http = statistics.median(times)

            # what the HTTP hop adds on top of doing the OCR itself
            overhead = http - ocr
            print(
                f"{p.name:30s} {size_kb:7.0f}K {dec:7.1f}ms {ocr:11.1f}ms "
                f"{http:9.1f}ms {overhead:+13.1f}ms"
            )
            if codes - {200}:
                print(f"{'':30s} non-200 responses: {codes}")

    # Upload cost at realistic mobile-link speeds: the file goes twice
    # (browser -> backend -> AI service), both multipart.
    print("\n--- upload time by link speed (file crosses 2 hops) ---")
    biggest = max(p.stat().st_size for p in IMAGES)
    for mbps in (1.0, 5.0, 20.0, 50.0):
        secs = (biggest * 8) / (mbps * 1_000_000) * 2
        print(
            f"  {mbps:5.1f} Mbps  {biggest/1024/1024:4.1f} MB image  "
            f"x2 hops = {secs*1000:7.0f} ms"
        )

    if server is not None:
        server.should_exit = True


if __name__ == "__main__":
    main()
