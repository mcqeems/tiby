"""Rebuild the local knowledge index from ``knowledge/manifest.json``.

Run once after adding approved PDFs to the manifest and every time the source
documents change. The manifest is rewritten with the new sha256 hashes and
chunk counts; the SQLite index itself is a gitignored build artifact.

Usage (from ``app/ai-service``)::

    uv run python scripts/ingest_knowledge.py
"""
from tiby_ai.ingest import ingest_manifest
from tiby_ai.rag import SQLiteRetriever

if __name__ == "__main__":
    print(ingest_manifest("knowledge/manifest.json", SQLiteRetriever()))
