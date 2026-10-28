"""Rebuild the local knowledge index from ``dataset/knowledge/manifest.json``.

Run once after adding approved PDFs to the manifest and every time the source
documents change. The manifest is rewritten with the new sha256 hashes and
chunk counts; the SQLite index itself is a gitignored build artifact.

Usage (dari `app/ai-service`)::

    uv run python scripts/ingest_knowledge.py
"""

import sys
from pathlib import Path

# Memastikan Python bisa menemukan folder `src/` saat script dijalankan
SRC_DIR = Path(__file__).resolve().parents[1] / "src"
sys.path.insert(0, str(SRC_DIR))

from guidance.ingest import ingest_manifest
from guidance.retrieval import SQLiteRetriever

# Path ke dataset
MANIFEST = (
    Path(__file__).resolve().parents[1] / "dataset" / "knowledge" / "manifest.json"
)

if __name__ == "__main__":
    print(ingest_manifest(MANIFEST, SQLiteRetriever()))
