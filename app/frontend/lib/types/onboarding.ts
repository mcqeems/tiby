// lib/types/onboarding.ts

export type PmoRelationship = "KELUARGA" | "KADER" | "NAKES";

export interface OcrOnboardingResult {
  patientName: string | null;
  regimenCode: string;
  dailyPillQuota: number;
  startDate: string;
  targetEndDate: string;
  confidence: number;
  rawText: string;
}

export interface OnboardingPayload {
  patient: {
    fullName: string;
    username: string;
    whatsappNumber: string;
  };
  pmo: {
    fullName?: string; // Opsional jika pakai PMO Existing
    username?: string; // Opsional jika pakai PMO Existing
    whatsappNumber?: string; // Opsional jika pakai PMO Existing
    id?: string; // Untuk PMO yang sudah terdaftar (Existing)
    relationship: PmoRelationship;
  };
  familyContact?: {
    fullName: string;
    whatsappNumber: string;
    notifyOnEscalation: boolean;
  };
  regimenCode: string;
  dailyPillQuota: number;
  reminderTimeLocal: string;
  timezone?: string;
  startDate: string;
}

export interface OnboardingCredentials {
  treatmentPlanId: string;
  patientUsername: string;
  patientPassword: string;
  pmoUsername: string;
  pmoPassword: string;
  patientUserId: string;
  pmoUserId: string;
}
