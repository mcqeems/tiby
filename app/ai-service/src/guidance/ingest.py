"""Offline PDF ingestion for the approved knowledge base.

Extracts text page by page, normalizes whitespace and line-break hyphenation,
and chunks by word count with overlap. Chunk IDs encode document, PDF page,
and part (``…-p12-c3``) so citations stay stable across rebuilds. Run through
``src/ingest_knowledge.py``; this module never runs during requests.
"""

import hashlib
import json
import re
from pathlib import Path

import pymupdf as fitz

from guidance.retrieval import SQLiteRetriever


def normalize_text(text: str) -> str:
    """Collapse whitespace and rejoin words split across line breaks."""
    text = re.sub(r"(?<=\w)-\s*\n\s*(?=\w)", "", text)
    return re.sub(r"\s+", " ", text).strip()


def chunk_page(
    text: str, *, chunk_words: int = 180, overlap_words: int = 35
) -> list[str]:
    """Split one page into overlapping word chunks.

    A trailing scrap shorter than 25 words is merged into the previous chunk
    instead of becoming a near-empty chunk of its own.
    """
    words = text.split()
    chunks: list[str] = []
    start = 0
    while start < len(words):
        end = min(start + chunk_words, len(words))
        if end - start < 25 and chunks:
            chunks[-1] += " " + " ".join(words[start:end])
            break
        chunks.append(" ".join(words[start:end]))
        if end == len(words):
            break
        start = end - overlap_words
    return chunks


def ingest_pdf(pdf_path: str | Path, metadata: dict, store: SQLiteRetriever) -> int:
    """Extract, chunk, and store one PDF; returns the number of chunks indexed.

    Pages with fewer than 80 characters of text (covers, blank pages) are
    skipped. Raises ``ValueError`` when no page yields extractable text.
    """
    pdf_path = Path(pdf_path)
    chunks: list[dict] = []
    with fitz.open(pdf_path) as doc:
        for page_index in range(doc.page_count):
            page = doc.load_page(page_index)
            text = normalize_text(str(page.get_text("text")))
            if len(text) < 80:
                continue
            for part_index, content in enumerate(chunk_page(text)):
                chunk_id = (
                    f"{metadata['document_id']}-p{page_index + 1}-c{part_index + 1}"
                )
                chunks.append(
                    {
                        "chunk_id": chunk_id,
                        "page": page_index + 1,
                        "section": None,
                        "text": content,
                    }
                )
    if not chunks:
        raise ValueError(f"No extractable text found in {pdf_path.name}")
    store.add_document(metadata, chunks)
    return len(chunks)


def metadata_hash(pdf_path: str | Path) -> str:
    """SHA-256 of the file bytes, recorded in the manifest for provenance."""
    digest = hashlib.sha256(Path(pdf_path).read_bytes()).hexdigest()
    return digest


def ingest_manifest(manifest_path: str | Path, store: SQLiteRetriever) -> dict:
    """Index every document in the manifest and write back its hash and chunk count."""
    path = Path(manifest_path)
    manifest = json.loads(path.read_text())
    total = 0
    for item in manifest["documents"]:
        pdf = (path.parent / item["file"]).resolve()
        count = ingest_pdf(pdf, item["metadata"], store)
        item["sha256"] = metadata_hash(pdf)
        item["indexed_chunks"] = count
        total += count
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    return {"documents": len(manifest["documents"]), "chunks": total}
