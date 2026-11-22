"""Workers AI vision OCR benchmark — streams, because non-stream returns {}.

Discovered while testing (2026-11-22):
  * @cf/llava-hf/llava-1.5-7b-hf        deprecated 2026-11-20, unusable
  * @cf/meta/llama-3.2-11b-vision-instruct  requires a one-time 'agree' prompt
  * @cf/moondream/moondream3.1-9B-A2B    works, but the NON-STREAM endpoint
    returns {"result":{},"success":true} for every request. Only stream:true
    returns output (and surfaces decode errors that are hidden otherwise).

So this script always streams. It reassembles chunks, measures end-to-end
latency and neurons, and compares the extracted text against local PP-OCRv6.

    CF_ACCOUNT_ID=... CF_AI_TOKEN=... python3 scripts/bench_cf_ai_ocr.py --runs 3
"""

from __future__ import annotations

import argparse
import base64
import dataclasses
import json
import os
import statistics
import sys
import time
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

MODEL = "@cf/moondream/moondream3.1-9B-A2B"

OCR_QUESTION = (
    "Transcribe every piece of text visible in this image, exactly as printed, "
    "line by line. Then extract these fields as JSON: patientName, regimenCode, "
    "dailyPillQuota (integer), startDate (YYYY-MM-DD), targetEndDate (YYYY-MM-DD). "
    "Use null for any field that is not present. Do not invent values."
)

IMAGES = sorted(
    p for p in Path("dataset/ocr").rglob("*") if p.suffix.lower() in {".png", ".jpg"}
)


def local_baseline(image_bytes: bytes) -> tuple[float, str]:
    from onboarding_ocr.ocr_service import extract_onboarding_card

    t0 = time.perf_counter()
    draft = extract_onboarding_card(image_bytes)
    ms = (time.perf_counter() - t0) * 1000.0
    d = dataclasses.asdict(draft) if dataclasses.is_dataclass(draft) else dict(draft)
    return ms, str(d.get("rawText", ""))


def stream_query(
    client: httpx.Client, account: str, token: str, image_bytes: bytes, mime: str
) -> tuple[float, str, dict[str, float]]:
    """One Moondream query over SSE. Returns (ms, text, usage)."""
    url = f"https://api.cloudflare.com/client/v4/accounts/{account}/ai/run/{MODEL}"
    payload = {
        "task": "query",
        "image": f"data:{mime};base64,{base64.b64encode(image_bytes).decode()}",
        "question": OCR_QUESTION,
        "reasoning": False,
        "temperature": 0.0,
        "max_tokens": 2048,
        "stream": True,
    }

    parts: list[str] = []
    usage: dict[str, float] = {}
    t0 = time.perf_counter()
    with client.stream(
        "POST", url, headers={"Authorization": f"Bearer {token}"}, json=payload, timeout=180.0
    ) as res:
        if res.status_code != 200:
            body = res.read().decode("utf-8", "replace")
            return (time.perf_counter() - t0) * 1000.0, f"HTTP {res.status_code}: {body[:200]}", usage
        for line in res.iter_lines():
            if not line.startswith("data:"):
                continue
            raw = line[5:].strip()
            if not raw or raw == "[DONE]":
                continue
            try:
                evt = json.loads(raw)
            except json.JSONDecodeError:
                continue
            if "usage" in evt and isinstance(evt["usage"], dict):
                for k in ("prompt_tokens", "completion_tokens", "neurons"):
                    if k in evt["usage"]:
                        usage[k] = evt["usage"][k]
            chunk = evt.get("chunk")
            if isinstance(chunk, dict):
                # Moondream streams CUMULATIVE text, not deltas: each chunk
                # repeats the whole answer so far. Keep only the latest, or
                # the transcript ends up with every prefix concatenated.
                for key in ("answer", "caption"):
                    val = chunk.get(key)
                    if isinstance(val, str) and val:
                        parts[:] = [val]
            # Moondream also streams bare debug text on invalid input
            if isinstance(evt.get("data"), str) and "Invalid input" in evt["data"]:
                return (time.perf_counter() - t0) * 1000.0, f"DECODE ERROR: {evt['data'][:200]}", usage
    return (time.perf_counter() - t0) * 1000.0, "".join(parts), usage


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--runs", type=int, default=2)
    ap.add_argument("--image", action="append", default=None)
    args = ap.parse_args()

    account = os.getenv("CF_ACCOUNT_ID")
    token = os.getenv("CF_AI_TOKEN")
    if not account or not token:
        sys.exit("set CF_ACCOUNT_ID and CF_AI_TOKEN")

    images = [Path(p) for p in args.image] if args.image else IMAGES
    report: list[dict[str, object]] = []

    with httpx.Client() as client:
        for p in images:
            data = p.read_bytes()
            mime = "image/png" if p.suffix.lower() == ".png" else "image/jpeg"
            base_ms, base_text = local_baseline(data)

            print(f"\n=== {p.name} ({len(data)/1024:.0f} KB) ===")
            print(f"  PP-OCRv6 local : {base_ms:8.1f} ms | {base_text[:100]!r}")

            times: list[float] = []
            text = ""
            usage: dict[str, float] = {}
            for _ in range(args.runs):
                ms, text, usage = stream_query(client, account, token, data, mime)
                times.append(ms)

            med = statistics.median(times)
            print(f"  Moondream      : {med:8.1f} ms | neurons={usage.get('neurons', 0):.1f}")
            print(f"    {text[:300]!r}")

            report.append(
                {
                    "image": p.name,
                    "local_ms": base_ms,
                    "local_text": base_text,
                    "moondream_ms": med,
                    "moondream_text": text,
                    "usage": usage,
                }
            )

    Path("cf_ai_ocr_bench.json").write_text(
        json.dumps(report, indent=2, default=str), encoding="utf-8"
    )

    print("\n--- latency summary ---")
    loc = statistics.median([float(r["local_ms"]) for r in report])
    mod = statistics.median([float(r["moondream_ms"]) for r in report])
    print(f"  PP-OCRv6 local median : {loc:8.1f} ms")
    print(f"  Moondream median      : {mod:8.1f} ms  ({loc/mod:.1f}x)")

    total_neurons = sum(float(r["usage"].get("neurons", 0)) for r in report)  # type: ignore[union-attr]
    n = sum(1 for r in report if r["usage"])
    if n:
        per = total_neurons / n
        print(f"\n  neurons/request ~= {per:.1f}")
        if per > 0:
            print(f"  free tier 10,000 neurons/day ~= {int(10_000/per)} requests/day")


if __name__ == "__main__":
    main()
