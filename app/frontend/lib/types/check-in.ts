import type {
  AiAudioExtractionResponse,
  CheckInVerdictResponse,
} from "@tiby/ts-shared";

// Tipe UI State
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
  extractedData: AiAudioExtractionResponse | null;
  verdict: CheckInVerdictResponse | null;
}

// Tipe API
export type MedicationStatus = "SUDAH_MINUM" | "BELUM_MINUM" | "TIDAK_PASTI";

export interface FallbackButtonsPayload {
  medicationStatus: MedicationStatus;
  pillsTakenCount: number;
  hasComplaints: boolean;
  selectedComplaints: string[];
}

export interface SubmitCheckInPayload {
  inputMode: "VOICE_STT" | "FALLBACK_BUTTONS";
  treatmentPlanId?: string;
  confirmedFacts?: {
    transcript: string;
    medicationStatus: MedicationStatus;
    pillsTakenCount: number;
    symptoms: string[];
    intentToStop: boolean;
    confidence: number;
  };
  fallbackButtons?: FallbackButtonsPayload;
}
