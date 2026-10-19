"""Keep ``dataset/knowledge/`` and its manifest from drifting apart.

Ingestion reads the manifest and never globs the folder, which is what keeps
unrelated notes out of the retrieval index. The cost of that design is silence:
a PDF added to ``raw/`` without a manifest entry is never indexed and guidance
keeps answering from the older corpus without any error. These tests are the
other half of the guarantee.
"""

import json
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
KNOWLEDGE = ROOT / "dataset" / "knowledge"
MANIFEST = KNOWLEDGE / "manifest.json"
RAW = KNOWLEDGE / "raw"


def manifest() -> dict:
    return json.loads(MANIFEST.read_text(encoding="utf-8"))


def test_manifest_lists_documents():
    assert manifest()["documents"], "the manifest is empty; guidance would cite nothing"


@pytest.mark.parametrize("entry", manifest()["documents"], ids=lambda e: e["metadata"]["document_id"])
def test_every_source_lives_under_raw(entry):
    assert (KNOWLEDGE / entry["file"]).resolve().is_relative_to(RAW.resolve())


@pytest.mark.parametrize("entry", manifest()["documents"], ids=lambda e: e["metadata"]["document_id"])
def test_every_entry_names_a_pdf_that_exists(entry):
    pdf = KNOWLEDGE / entry["file"]
    assert pdf.is_file(), f"{entry['file']} is in the manifest but not on disk"
    assert pdf.suffix == ".pdf"


def test_every_pdf_in_raw_is_in_the_manifest():
    listed = {(KNOWLEDGE / entry["file"]).resolve() for entry in manifest()["documents"]}
    stranded = {pdf for pdf in RAW.glob("*") if pdf.suffix == ".pdf"} - listed
    assert not stranded, f"indexed never, guidance answers from the older corpus: {sorted(str(p) for p in stranded)}"


@pytest.mark.parametrize("entry", manifest()["documents"], ids=lambda e: e["metadata"]["document_id"])
def test_every_entry_records_its_provenance(entry):
    metadata = entry["metadata"]
    assert metadata["organization"] in {"WHO", "Kemenkes"}
    assert metadata["title"] and metadata["source_url"]
    assert len(entry.get("sha256", "")) == 64, "rebuild the index to record this document's hash"


def test_knowledge_folder_holds_no_loose_notes():
    """Only ``raw/``, the manifest, the README, and the generated index."""
    allowed = {"manifest.json", "README.md", "tiby.db", "raw"}
    assert {p.name for p in KNOWLEDGE.iterdir()} <= allowed