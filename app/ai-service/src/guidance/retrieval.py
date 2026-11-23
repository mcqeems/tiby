"""Auditable SQLite FTS5 retrieval over the approved knowledge base.

Deliberately no embeddings: every hit keeps its document ID and PDF page so
citations can be traced back to the source PDF. The database file is a build
artifact (gitignored) rebuilt by ``scripts/ingest_knowledge.py``.
"""

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


# Minimum fraction of a query's content terms a chunk must contain to count as
# evidence. At 0.5 a two-concept question needs both concepts and a three-concept
# question needs two, which keeps natural questions answerable while rejecting
# chunks that share only one incidental word.
MIN_COVERAGE = 0.5

# Indonesian function words and common question fillers: they appear in nearly
# every chunk or add noise without carrying clinical/product meaning.
STOPWORDS = frozenset(
    [
        "ada", "adalah", "agar", "akan", "aku", "anda", "apa", "apakah",
        "atau", "bagaimana", "belum", "berapa", "biasa", "biasanya", "bila",
        "bisa", "boleh", "bolehkah", "bukan", "cara", "dalam", "dan", "dapat",
        "dari", "dengan", "di", "digunakan", "dimana", "dong", "gak", "gimana",
        "gue", "harus", "haruskah", "ini", "itu", "jadi", "jelaskan", "jika",
        "juga", "kalau", "kalo", "kamu", "kapan", "karena", "ke", "kenapa",
        "kepada", "kita", "lagi", "mana", "masih", "memang", "mengapa",
        "mereka", "mohon", "nggak", "pasien", "perlu", "perlukah", "saat",
        "saja", "salah", "sama", "sambil", "sampai", "sangat", "saya",
        "sebagai", "sebaiknya", "secara", "sedang", "sehingga", "seperti",
        "siapa", "sih", "sudah", "tahu", "tapi", "tentang", "terhadap",
        "termasuk", "tetapi", "tidak", "tolong", "untuk", "yaitu", "yang",
    ]
)


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
        """Return chunks that actually cover the query's concepts, best first.

        A plain ``OR`` match is unusable here: common Indonesian words (``apa``,
        ``itu``, ``obat``) appear in nearly every chunk, so OR always returns
        confident nonsense and the caller can never take its "no evidence"
        path. A plain ``AND`` is equally unusable, because one stray word in a
        natural question empties the result set.

        So candidates come from ``OR`` and are then filtered by *coverage*: the
        fraction of the query's content terms a chunk contains. Chunks that
        cover only a single incidental word are dropped (``MIN_COVERAGE``); the
        rest are ranked by coverage, then by bm25 as the tie-break. Coverage is
        language-agnostic and needs no calibrated score threshold, which bm25
        cannot honestly provide for a corpus this size.

        Terms are lowercased, split on word boundaries, prefix-matched so
        ``obat`` also finds ``obatnya``, and quoted to keep FTS5 operator syntax
        out of user input. Returns ``[]`` when the query has no content terms or
        nothing covers enough of them.
        """
        terms = self._content_terms(query)
        if not terms:
            return []
        candidates = self._match_any(
            " OR ".join(f'"{term}"*' for term in terms), limit * 8, terms
        )
        scored = [
            (self._coverage(item.text, terms), rank, item)
            for rank, item in enumerate(candidates)
        ]
        relevant = [entry for entry in scored if entry[0] >= MIN_COVERAGE]
        relevant.sort(key=lambda entry: (-entry[0], entry[1]))
        return [item for _, _, item in relevant[:limit]]

    @staticmethod
    def _content_terms(query: str) -> list[str]:
        """Query words minus Indonesian function words that carry no meaning."""
        words = re.findall(r"[\wÀ-ÿ]+", query.lower())
        return [
            word
            for word in words
            if (len(word) > 2 or word == "tb") and word not in STOPWORDS
        ][:12]

    @staticmethod
    def _coverage(text: str, terms: list[str]) -> float:
        """Fraction of query terms whose prefix appears in ``text``."""
        haystack = text.lower()
        hits = sum(1 for term in terms if term in haystack)
        return hits / len(terms)

    def _match_any(self, match: str, limit: int, terms: list[str]) -> list[Evidence]:
        """Run one FTS5 MATCH expression and map the rows to ``Evidence``."""
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
