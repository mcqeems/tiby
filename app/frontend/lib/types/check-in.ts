import type {
  AiAudioExtractionResponse,
  AiAudioTranscriptResponse,
  CheckInVerdictResponse,
} from "@tiby/ts-shared";

export type {
  AiAudioExtractionResponse,
  AiAudioTranscriptResponse,
  CheckInEducationalCard,
  CheckInVerdictResponse,
  FallbackButtonsPayload,
  MedicationStatus,
  SubmitCheckInDto,
  TextExtractRequest,
} from "@tiby/ts-shared";
export type { CheckInList as CheckInHistoryResponse } from "@tiby/ts-shared";
export type { CheckInListItem as CheckInHistoryItem } from "@tiby/ts-shared";

/** Screen states the check-in flow moves through (frontend-only). */
export type CheckInStep =
  | "record"
  | "review"
  | "fallback"
  | "result"
  | "locked"
  | "loading";

export interface CheckInState {
  step: CheckInStep;
  audioBlob: Blob | null;
  transcript: string;
  extractedData: AiAudioTranscriptResponse | AiAudioExtractionResponse | null;
  verdict: CheckInVerdictResponse | null;
}
