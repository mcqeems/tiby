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
  // Variasi penamaan PMO dari backend
  pmoName?: string;
  pmoFullName?: string;
  pmoUsername?: string;
  pmoWhatsapp?: string;
  pmo?: {
    fullName?: string;
    username?: string;
    whatsappNumber?: string;
    relationship?: string;
  };
}

export interface PatientStatusHistoryItem {
  id: string;
  date: string;
  status: "SUDAH_MINUM" | "BELUM_MINUM" | "TIDAK_PASTI";
  pillsTaken: number;
  complaints?: string[];
}
