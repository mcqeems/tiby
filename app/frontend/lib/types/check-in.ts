import type {
  AiAudioExtractionResponse,
  AiAudioTranscriptResponse,
  CheckInVerdictResponse,
  SafetyVerdict,
  TodayCheckInStatus,
} from "@tiby/ts-shared";

export type {
  AiAudioExtractionResponse,
  AiAudioTranscriptResponse,
  CheckInEducationalCard,
  CheckInVerdictResponse,
  CreateMissedCheckInReportDto,
  FallbackButtonsPayload,
  MedicationStatus,
  MissedCheckInReportItem,
  MissedCheckInSummaryResponse,
  MissedReportStatus,
  SafetyVerdict,
  SubmitCheckInDto,
  TextExtractRequest,
  TodayCheckInStatus,
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

/** Only VERDICT TERKENDALI locks further same-day check-ins. */
export function isCheckInLockedToday(
  status?: SafetyVerdict | TodayCheckInStatus | string | null,
): boolean {
  return status === "TERKENDALI";
}

export function formatTodayStatusLabel(
  status?: SafetyVerdict | TodayCheckInStatus | string | null,
): string {
  switch (status) {
    case "TERKENDALI":
      return "Terkendali";
    case "PERLU_PERHATIAN":
      return "Perlu Perhatian";
    case "SEGERA_KE_FASKES":
      return "Segera ke Faskes";
    default:
      return "Belum Check-in";
  }
}
