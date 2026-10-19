"""Tiby AI service — fact extraction and grounded guidance for TB check-ins.

This package extracts reported facts from check-in transcripts and answers
general educational questions with citation-grounded text from approved
WHO/Kemenkes sources. It never diagnoses, assigns risk, or recommends
treatment: null means "unstated or uncertain", and deterministic safety rules
live in the main backend. The HTTP contract is the OpenCollection (Bruno
format) collection in shared/api-contract; the package is designed to be
readable module by module:

- ``main`` — HTTP routes, error envelope, and dependency wiring.
- ``contracts`` — request/response models mirroring the OpenAPI schema.
- ``guidance.safety`` — deterministic fail-closed guard for personal action requests.
- ``guidance.service`` — evidence packing, citation allowlisting, grounded rendering.
- ``guidance.retrieval`` / ``guidance.ingest`` — auditable FTS5 retrieval and PDF ingestion.
- ``providers`` — LLM and speech-to-text adapters behind small protocols.
- ``extraction.extractor`` / ``prompts`` — rule-based fallback and prompt templates.
"""
