"""Auditable SQLite FTS5 retrieval over the approved knowledge base.

Deliberately no embeddings: every hit keeps its document ID and PDF page so
citations can be traced back to the source PDF. The database file is a build
artifact (gitignored) rebuilt by ``src/ingest_knowledge.py``.
"""

import json
import re
import sqlite3
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Citation:
    """Source metadata for one retrievable chunk (page = PDF page number)."""

    citation_id: str
    document_id: str
    organization: str
    title: str
    year: int | None
    page: int | None
    section: str | None
    source_url: str


@dataclass(frozen=True)
class Evidence:
    """A matched chunk plus the citation metadata needed to audit it."""

    citation: Citation
    text: str


class SQLiteRetriever:
    """Small auditable FTS5 store; no vector database required for the MVP."""

    def __init__(self, db_path: str | Path | None = None):
        self.db_path = Path(db_path or Path(__file__).resolve().parents[2] / "dataset" / "knowledge" / "tiby.db")
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        with sqlite3.connect(self.db_path) as db:
            db.executescript(
                """
                CREATE TABLE IF NOT EXISTS documents (
                    document_id TEXT PRIMARY KEY, organization TEXT NOT NULL,
                    title TEXT NOT NULL, year INTEGER, source_url TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS chunks (
                    chunk_id TEXT PRIMARY KEY, document_id TEXT NOT NULL,
                    page INTEGER, section TEXT, text TEXT NOT NULL,
                    FOREIGN KEY(document_id) REFERENCES documents(document_id)
                );
                CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
                    chunk_id UNINDEXED, text, content='chunks', content_rowid='rowid'
                );
                """
            )

    def add_document(self, metadata: dict, chunks: list[dict]) -> None:
        """Insert or replace a document and its chunks, then rebuild the FTS index."""
        with sqlite3.connect(self.db_path) as db:
            db.execute(
                "INSERT OR REPLACE INTO documents VALUES (?, ?, ?, ?, ?)",
                (metadata["document_id"], metadata["organization"], metadata["title"], metadata.get("year"), metadata["source_url"]),
            )
            db.execute("DELETE FROM chunks WHERE document_id = ?", (metadata["document_id"],))
            for chunk in chunks:
                db.execute(
                    "INSERT OR REPLACE INTO chunks VALUES (?, ?, ?, ?, ?)",
                    (chunk["chunk_id"], metadata["document_id"], chunk.get("page"), chunk.get("section"), chunk["text"]),
                )
            db.execute("INSERT INTO chunks_fts(chunks_fts) VALUES('rebuild')")

    def search(self, query: str, limit: int = 4) -> list[Evidence]:
        """Return the best bm25-ranked chunks for a free-text query.

        The query is lowered, split into word tokens (first 12), OR-joined, and
        quoted to keep FTS5 syntax out of user input. Returns ``[]`` when the
        query has no word characters; there is no relevance threshold yet, so
        callers treat weak hits as candidates only.
        """
        terms = re.findall(r"[\wÀ-ÿ]+", query.lower())
        if not terms:
            return []
        match = " OR ".join(f'"{term}"' for term in terms[:12])
        with sqlite3.connect(self.db_path) as db:
            rows = db.execute(
                """SELECT c.chunk_id, d.document_id, d.organization, d.title, d.year,
                          c.page, c.section, d.source_url, c.text
                   FROM chunks_fts f JOIN chunks c ON c.rowid=f.rowid
                   JOIN documents d ON d.document_id=c.document_id
                   WHERE chunks_fts MATCH ? ORDER BY bm25(chunks_fts) LIMIT ?""",
                (match, limit),
            ).fetchall()
        return [Evidence(Citation(*row[:8]), row[8]) for row in rows]

    def seed_json(self, path: str | Path) -> int:
        """Bulk-load ``[{"metadata": ..., "chunks": [...]}, ...]``; returns the count."""
        data = json.loads(Path(path).read_text())
        for item in data:
            self.add_document(item["metadata"], item["chunks"])
        return len(data)
