"""Request/response models mirroring the OpenCollection contract in
``shared/api-contract`` (Bruno format).

Design rules that the rest of the service relies on:

- ``null`` means "unstated or uncertain", never false.
- Models forbid additional properties, so provider or client output that
  invents clinical decisions (for example ``risk_status``) is rejected
  instead of silently accepted.
- ``confidence`` is extraction certainty, not clinical probability.
"""

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

Confidence = Annotated[float, Field(ge=0, le=1)]
"""A 0..1 certainty reading, kept as a reusable alias so every model agrees."""


class CheckInRequest(BaseModel):
    """A transcript to extract reported facts from, plus its language tag."""

    model_config = ConfigDict(extra="forbid")

    transcript: str = Field(min_length=1, max_length=5000)
    language: str = "id-ID"


class MedicationReport(BaseModel):
    """What the transcript said about taking medication today."""

    model_config = ConfigDict(extra="forbid")

    taken: bool | None
    dose_count: int | None = Field(default=None, ge=0)


class Symptom(BaseModel):
    """One symptom the speaker directly reported, with its exact quote."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    severity: Literal["mild", "moderate", "severe", "unknown"] = "unknown"
    evidence: str = Field(min_length=1)


class Extraction(BaseModel):
    """The fact set extracted from one check-in transcript."""

    model_config = ConfigDict(extra="forbid")

    medication: MedicationReport
    symptoms: list[Symptom] = Field(default_factory=list)
    possible_red_flags: list[str] = Field(default_factory=list)
    intent_to_stop: bool | None


class CheckInResponse(BaseModel):
    """Extraction result; deliberately free of diagnosis or risk decisions."""

    model_config = ConfigDict(extra="forbid")

    schema_version: Literal["1.0"] = "1.0"
    extraction: Extraction
    confidence: Confidence
    uncertainties: list[str] = Field(default_factory=list)


class AiAudioExtractionResponse(BaseModel):
    """Flat contract consumed by the backend check-in preview flow."""

    model_config = ConfigDict(extra="forbid")

    transcript: str = Field(min_length=1)
    medicationTaken: Literal["SUDAH_MINUM", "BELUM_MINUM", "TIDAK_PASTI"]
    pillsTakenCount: int | None = Field(ge=0)
    symptoms: list[str] = Field(default_factory=list)
    intentToStopOrRefuse: bool
    extractionConfidence: Confidence
    emotionalSentiment: str | None = None


class TranscriptResponse(BaseModel):
    """Transcript-only answer of the audio endpoint.

    Facts are extracted later, from the transcript the patient confirmed, so
    this response deliberately carries nothing else.
    """

    model_config = ConfigDict(extra="forbid")

    transcript: str = Field(min_length=1)


class AudioExtractionResponse(TranscriptResponse):
    """Backend-compatible extraction plus transcription provider metadata."""

    transcription_provider: str = Field(min_length=1)
    transcription_model: str = Field(min_length=1)


class OcrOnboardingDraft(BaseModel):
    """Unconfirmed fields read from an onboarding card; never clinical advice.

    ``fieldConfidence`` and ``uncertainties`` exist because a single document
    score hides the failure mode that matters: one field read perfectly while
    the dose was misread. A Nakes re-checks every field, but only these two
    tell them *which* ones the engine was unsure about.
    """

    model_config = ConfigDict(extra="forbid")

    patientName: str | None
    regimenCode: str | None
    dailyPillQuota: int | None = Field(ge=1)
    startDate: str | None
    targetEndDate: str | None
    confidence: Confidence
    rawText: str
    fieldConfidence: dict[str, Confidence] = Field(default_factory=dict)
    uncertainties: list[str] = Field(default_factory=list)


class GuidanceRequest(BaseModel):
    """A general educational question, optionally with check-in context."""

    model_config = ConfigDict(extra="forbid")

    question: str = Field(min_length=1, max_length=3000)
    transcript: str | None = Field(default=None, max_length=5000)


class GuidanceCitation(BaseModel):
    """Source metadata for one chunk of approved-source evidence."""

    model_config = ConfigDict(extra="forbid")

    citation_id: str
    document_id: str
    organization: Literal["WHO", "Kemenkes"]
    title: str
    year: int | None = None
    page: int | None = None
    section: str | None = None
    source_url: str


class GuidanceEvidence(BaseModel):
    """A cited chunk paired with the citation ID the answer referenced."""

    model_config = ConfigDict(extra="forbid")

    citation_id: str
    text: str


class GuidanceResponse(BaseModel):
    """Grounded answer contract; ``answer`` is null whenever it fails closed."""

    model_config = ConfigDict(extra="forbid")

    answer: str | None
    grounded: bool
    evidence: list[GuidanceEvidence] = Field(default_factory=list)
    citations: list[GuidanceCitation] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)


class ApiError(BaseModel):
    """The single error envelope every non-2xx response uses."""

    model_config = ConfigDict(extra="forbid")

    code: Literal[
        "INVALID_REQUEST", "EXTRACTION_FAILED", "PROVIDER_TIMEOUT", "INTERNAL"
    ]
    message: str
    request_id: str | None = None
