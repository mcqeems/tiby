export type PatientState =
  | "AKTIF"
  | "PENDING"
  | "BERISIKO"
  | "PUTUS_FOLLOW_UP"
  | "DIJEDA"
  | "DIPANTAU_TERBATAS"
  | "PINDAH_FASKES"
  | "SELESAI";

export type TreatmentPhase = "INTENSIF" | "LANJUTAN";

export interface RiskSortedPatientItem {
  id: string;
  patientUserId: string;
  patientName: string;
  username: string;
  patientState: PatientState;
  phase: TreatmentPhase;
  regimenCode: string;
  dailyPillQuota: number;
  currentStreak: number;
  consecutiveSilenceDays: number;
  riskScore: number;
  todayCheckInLocked: boolean;
  whatsappVerified: boolean;
  startDate?: string;
  pmo: {
    userId: string;
    fullName: string;
    username: string;
    whatsappNumber: string | null;
    relationship: string;
    isPrimary: boolean;
  } | null;
}

export interface PatientStatusHistoryItem {
  id: string;
  date: string;
  status: "SUDAH_MINUM" | "BELUM_MINUM" | "TIDAK_PASTI";
  pillsTaken: number;
  complaints?: string[];
}
