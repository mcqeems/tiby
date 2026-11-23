
from guidance.retrieval import SQLiteRetriever


def test_sqlite_fts_retrieves_chunk_and_citation(tmp_path):
    retriever = SQLiteRetriever(tmp_path / "test.db")
    retriever.add_document(
        {
            "document_id": "who-demo",
            "organization": "WHO",
            "title": "Synthetic demo guidance",
            "year": 2024,
            "source_url": "https://who.int/example",
        },
        [{"chunk_id": "who-demo-p1", "page": 1, "section": "Adherence", "text": "Adherence support helps people continue their treatment."}],
    )
    results = retriever.search("treatment adherence", limit=2)
    assert len(results) == 1
    assert results[0].citation.organization == "WHO"
    assert results[0].citation.page == 1
    assert "continue their treatment" in results[0].text


def test_sqlite_fts_no_match_returns_empty(tmp_path):
    retriever = SQLiteRetriever(tmp_path / "test.db")
    assert retriever.search("unrelated unknown query") == []


def test_sqlite_fts_ignores_indonesian_fillers_and_retains_tb(tmp_path):
    retriever = SQLiteRetriever(tmp_path / "test.db")
    retriever.add_document(
        {
            "document_id": "kemenkes-demo",
            "organization": "Kemenkes",
            "title": "Panduan Demo",
            "year": 2025,
            "source_url": "https://kemkes.go.id/example",
        },
        [
            {
                "chunk_id": "kemenkes-demo-p1",
                "page": 12,
                "section": "Efek Samping",
                "text": "Mual ringan merupakan efek samping umum pengobatan TB.",
            }
        ],
    )
    results = retriever.search("Apakah saya boleh tahu efek samping mual TB?", limit=2)
    assert len(results) == 1
    assert results[0].citation.document_id == "kemenkes-demo"
