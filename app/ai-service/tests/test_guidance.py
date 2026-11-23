import pytest

from guidance.retrieval import Citation, Evidence
from guidance.service import pack_evidence, render_answer


def make_evidence(document_id="who-demo", page=7, text="Adherence support text."):
    return Evidence(
        Citation(
            "chunk-1",
            document_id,
            "WHO",
            "Demo guidance",
            2025,
            page,
            None,
            "https://who.int",
        ),
        text,
    )


def test_pack_evidence_assigns_src_ids_and_keeps_metadata():
    packed = pack_evidence([make_evidence(), make_evidence(document_id="kemenkes-demo", page=3)])
    assert [item["citation"]["citation_id"] for item in packed] == ["src-1", "src-2"]
    assert packed[0]["citation"]["document_id"] == "who-demo"
    assert packed[1]["citation"]["page"] == 3
    assert packed[0]["text"] == "Adherence support text."


def test_render_answer_dedupes_repeated_citation_ids():
    evidence = pack_evidence([make_evidence(), make_evidence(document_id="kemenkes-demo")])
    result = render_answer(
        {"answer": "Ringkasan.", "grounded": True, "citation_ids": ["src-1", "src-1"], "limitations": []},
        evidence,
    )
    assert [citation.citation_id for citation in result.citations] == ["src-1"]
    assert [item.citation_id for item in result.evidence] == ["src-1"]


def test_render_answer_rejects_unknown_citation_id():
    evidence = pack_evidence([make_evidence()])
    with pytest.raises(ValueError):
        render_answer(
            {"answer": "x", "grounded": True, "citation_ids": ["src-99"], "limitations": []},
            evidence,
        )


def test_render_answer_keeps_uncited_answer_but_reports_not_grounded():
    """A general-health answer with no backing source is still an answer.

    Regression guard for the bug where any ``grounded=false`` response was
    stripped to ``answer=null``, which the app rendered as "out of scope".
    """
    evidence = pack_evidence([make_evidence()])
    result = render_answer(
        {"answer": "x", "grounded": False, "citation_ids": [], "limitations": ["a"]},
        evidence,
    )
    assert result.answer == "x"
    assert result.grounded is False
    assert result.citations == []
    assert result.evidence == []
    assert result.limitations == ["a"]


def test_render_answer_ignores_grounded_claim_without_citation():
    """The provider cannot mark itself grounded while citing nothing."""
    result = render_answer(
        {"answer": "x", "grounded": True, "citation_ids": [], "limitations": []},
        pack_evidence([make_evidence()]),
    )
    assert result.answer == "x"
    assert result.grounded is False


def test_render_answer_keeps_answer_when_grounded_discards_evidence():
    """``grounded`` gates the citations, not the answer text."""
    evidence = pack_evidence([make_evidence()])
    result = render_answer(
        {"answer": "Ringkasan.", "grounded": True, "citation_ids": ["src-1"], "limitations": []},
        evidence,
    )
    assert result.answer == "Ringkasan."
    assert result.grounded is True
    assert [item.citation_id for item in result.evidence] == ["src-1"]


def test_render_answer_treats_blank_answer_as_not_grounded():
    evidence = pack_evidence([make_evidence()])
    result = render_answer(
        {"answer": "   ", "grounded": True, "citation_ids": ["src-1"], "limitations": []},
        evidence,
    )
    assert result.answer is None
    assert result.grounded is False


def test_render_answer_ignores_non_list_limitations():
    evidence = pack_evidence([make_evidence()])
    result = render_answer(
        {"answer": "x", "grounded": False, "citation_ids": [], "limitations": "bukan list"},
        evidence,
    )
    assert result.limitations == []
