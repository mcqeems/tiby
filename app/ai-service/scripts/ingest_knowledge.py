"""Rebuild the local knowledge index from ``knowledge/manifest.json``.

Run once after adding approved PDFs to the manifest and every time the source
documents change. The manifest is rewritten with the new sha256 hashes and
chunk counts; the SQLite index itself is a gitignored build artifact.

Usage::

    uv run python scripts/ingest_knowledge.py

Paths resolve from this file, so it runs from any working directory.
"""
from pathlib import Path

from tiby_ai.guidance.ingest import ingest_manifest
from tiby_ai.guidance.retrieval import SQLiteRetriever

MANIFEST = Path(__file__).resolve().parents[1] / "knowledge" / "manifest.json"

if __name__ == "__main__":
    print(ingest_manifest(MANIFEST, SQLiteRetriever()))
