

export type MedicationStatus = "SUDAH_MINUM" | "BELUM_MINUM" | "TIDAK_PASTI";

export interface TextExtractRequest {
  editedTranscript: string;
  treatmentPlanId?: string;
}

export interface FallbackButtonsPayload {
  medicationStatus: MedicationStatus;
  pillsTakenCount: number;
  hasComplaints: boolean;
  selectedComplaints: string[];
}

export interface SubmitCheckInDto {
  inputMode: "VOICE_STT" | "FALLBACK_BUTTONS";
  treatmentPlanId?: string;
  confirmedFacts?: {
    transcript: string;
    medicationStatus: MedicationStatus;
    pillsTakenCount: number | null;
    symptoms: string[];
    intentToStop: boolean;
    confidence: number;
  };
  fallbackButtons?: FallbackButtonsPayload;
}


/** Audio step: transcript only. Facts come from the text-extract step. */
export interface AiAudioTranscriptResponse {
  transcript: string;
}

export interface AiAudioExtractionResponse {
  transcript: string;
  medicationTaken: string;
  pillsTakenCount: number | null;
  symptoms: string[];
  intentToStopOrRefuse: boolean;
  extractionConfidence: number;
  emotionalSentiment?: string;
}

export interface CheckInEducationalCard {
  id: string;
  title: string;
  summary: string;
  contentMarkdown: string;
  category: string;
}

export interface CheckInVerdictResponse {
  checkInId: string;
  verdict: "TERKENDALI" | "PERLU_PERHATIAN" | "SEGERA_KE_FASKES";
  isDoseFulfilled: boolean;
  redoRequiredToday: boolean;
  currentStreak: number;
  message: string;
  matchedRules: string[];
  educationalCard?: CheckInEducationalCard;
  submittedAt: string;
}


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


export interface CheckInHistoryItem {
  id: string;
  treatmentPlanId: string;
  patientUserId: string;
  patientName: string;
  facilityId: string;
  facilityName: string;
  checkInDate: string; // YYYY-MM-DD
  attemptNumber: number;
  reportedByRole: string;
  inputMode: string;
  medicationStatus: MedicationStatus;
  pillsTakenCount: number;
  isDoseFulfilled: boolean;
  sttConfidence: number | null;
  submittedAt: string;
  verdict: "TERKENDALI" | "PERLU_PERHATIAN" | "SEGERA_KE_FASKES";
}

export interface CheckInHistoryResponse {
  items: CheckInHistoryItem[];
  total: number;
  page: number;
  limit: number;
}
