export type MedicationStatus = "SUDAH_MINUM" | "BELUM_MINUM" | "TIDAK_PASTI";
export type InputMode = "VOICE_STT" | "FALLBACK_BUTTONS";
export type Verdict = "TERKENDALI" | "PERLU_PERHATIAN" | "SEGERA_KE_FASKES";

export interface FallbackButtonsPayload {
  medicationStatus: MedicationStatus;
  pillsTakenCount: number;
  hasComplaints: boolean;
  selectedComplaints: string[];
}

export interface SubmitCheckInPayload {
  inputMode: InputMode;
  treatmentPlanId?: string; // Wajib untuk PMO
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
