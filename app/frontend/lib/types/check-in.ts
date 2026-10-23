

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
    pillsTakenCount: number;
    symptoms: string[];
    intentToStop: boolean;
    confidence: number;
  };
  fallbackButtons?: FallbackButtonsPayload;
}


export interface AiAudioTranscriptResponse {
  transcript: string;
  medicationTaken: string; // Atau gunakan MedicationStatus jika sesuai
  pillsTakenCount: number;
  symptoms: string[];
  intentToStopOrRefuse: boolean;
  extractionConfidence: number;
  emotionalSentiment: string;
}

// Struktur AiAudioExtractionResponse sama dengan Transcript di atas
export type AiAudioExtractionResponse = AiAudioTranscriptResponse;

export interface CheckInVerdictResponse {
  checkInId: string;
  verdict: "TERKENDALI" | "PERLU_PERHATIAN" | "SEGERA_KE_FASKES";
  isDoseFulfilled: boolean;
  redoRequiredToday: boolean;
  currentStreak: number;
  message: string;
  matchedRules: string[];
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
