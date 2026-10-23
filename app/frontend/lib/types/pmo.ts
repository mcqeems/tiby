export interface PmoPatient {
  treatmentPlanId: string;
  patientName: string;
  isLockedToday: boolean;
  todayVerdict: string | null;
  currentStreak: number;
  phase: string;
  consecutiveSilenceDays: number;
}

export type PmoPatientStatusList = PmoPatient[];

export type PmoAction =
  | "MENGHUBUNGI_PASIEN"
  | "KUNJUNGAN_RUMAH"
  | "MENGHUBUNGI_KELUARGA"
  | "MENGANTAR_OBAT"
  | "EDUKASI_KONSULTASI"
  | "MENGINGATKAN_JADWAL_KONTROL"
  | "LAINNYA";

export interface CreatePmoFollowUpDto {
  actionTaken: PmoAction;
  notes: string;
}

export interface PmoFollowUpResponse {
  success: boolean;
  followUpId: string;
  notes: string;
}
