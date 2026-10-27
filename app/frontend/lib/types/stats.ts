export interface PatientStats {
  role: "PASIEN";
  currentStreak: number;
  adherenceRate: number;
  daysRemaining: number;
  todayCheckInStatus:
    | "BELUM_CHECK_IN"
    | "TERKENDALI"
    | "PERLU_PERHATIAN"
    | "SEGERA_KE_FASKES";
  totalPillsTaken: number;
  currentPhase: string;
}

export interface PmoStats {
  role: "PMO";
  totalPatients: number;
  checkedInToday: number;
  pendingCheckIn: number;
  highRiskPatients: number;
  unreadAlerts: number;
}

export interface NakesStats {
  role: "NAKES";
  totalPatients: number;
  highRiskPatients: number;
  openTickets: number;
  criticalTickets: number;
  unreadAlerts: number;
  adherenceRate: number;
}

export interface AdminStats {
  role: "ADMIN";
  totalFacilities: number;
  totalNakes: number;
  totalPatients: number;
  totalActiveTickets: number;
}

export type StatsResponse = PatientStats | PmoStats | NakesStats | AdminStats;
