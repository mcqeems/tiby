export interface PmoPatient {
  treatmentPlanId: string;
  patientName: string;
  isLockedToday: boolean;
  todayVerdict: string | null;
  currentStreak: number;
  phase: string;
  consecutiveSilenceDays: number;
}

export interface CreatePmoFollowUpPayload {
  actionTaken: string; // e.g., "MENGHUBUNGI_PASIEN"
  notes: string;
}
