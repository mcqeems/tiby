from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class CheckInRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    transcript: str = Field(min_length=1, max_length=5000)
    language: str = "id-ID"


class MedicationReport(BaseModel):
    model_config = ConfigDict(extra="forbid")

    taken: bool | None
    dose_count: int | None = Field(default=None, ge=0)


class Symptom(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    severity: Literal["mild", "moderate", "severe", "unknown"] = "unknown"
    evidence: str = Field(min_length=1)


class Extraction(BaseModel):
    model_config = ConfigDict(extra="forbid")

    medication: MedicationReport
    symptoms: list[Symptom] = Field(default_factory=list)
    possible_red_flags: list[str] = Field(default_factory=list)
    intent_to_stop: bool | None


class CheckInResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: Literal["1.0"] = "1.0"
    extraction: Extraction
    confidence: float = Field(ge=0, le=1)
    uncertainties: list[str] = Field(default_factory=list)


class ApiError(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: Literal[
        "INVALID_REQUEST", "EXTRACTION_FAILED", "PROVIDER_TIMEOUT", "INTERNAL"
    ]
    message: str
    request_id: str | None = None
