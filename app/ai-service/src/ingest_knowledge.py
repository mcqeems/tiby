"""Rebuild the local knowledge index from ``dataset/knowledge/manifest.json``.

Run once after adding approved PDFs to the manifest and every time the source
documents change. The manifest is rewritten with the new sha256 hashes and
chunk counts; the SQLite index itself is a gitignored build artifact.

Usage::

    PYTHONPATH=src uv run python src/ingest_knowledge.py

Paths resolve from this file, so it runs from any working directory.
"""
from pathlib import Path

from guidance.ingest import ingest_manifest
from guidance.retrieval import SQLiteRetriever

MANIFEST = Path(__file__).resolve().parents[1] / "dataset" / "knowledge" / "manifest.json"

if __name__ == "__main__":
    print(ingest_manifest(MANIFEST, SQLiteRetriever()))
