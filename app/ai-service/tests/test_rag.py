
from tiby_ai.guidance.retrieval import SQLiteRetriever


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
