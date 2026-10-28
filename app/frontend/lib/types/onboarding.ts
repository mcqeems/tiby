// lib/types/onboarding.ts

export type PmoRelationship = "KELUARGA" | "KADER" | "NAKES";

export interface OcrOnboardingDraft {
  patientName: string | null;
  regimenCode: string;
  dailyPillQuota: number;
  startDate: string;
  targetEndDate: string;
  confidence: number;
  rawText: string;
}

export interface CreateOnboardingDto {
  patient: {
    fullName: string;
    username: string;
    whatsappNumber: string;
  };
  pmo: {
    fullName?: string;
    username?: string;
    whatsappNumber?: string;
    id?: string;
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
  pmoPassword: string | null; 
  patientUserId: string;
  pmoUserId: string | null;
  pmoCreated?: boolean; 
}

export type OnboardingPayload = CreateOnboardingDto;
