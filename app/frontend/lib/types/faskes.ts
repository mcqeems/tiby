
export type PatientState =
  | "AKTIF"
  | "PENDING"
  | "BERISIKO"
  | "PUTUS_FOLLOW_UP"
  | "DIJEDA"
  | "PINDAH_FASKES"
  | "SELESAI"
  | "DIPANTAU_TERBATAS";

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
  lastCheckInDate: string | null;
  todayCheckInLocked: boolean;
  startDate: string;
  targetEndDate: string;
  whatsappVerified: boolean;
  pushSubscribed: boolean;
  pmo: {
    userId: string;
    fullName: string;
    username: string;
    whatsappNumber: string | null;
    relationship: string;
    isPrimary: boolean;
  } | null;
}

export interface ListPatientsQuery {
  page?: number;
  limit?: number;
  state?: PatientState;
  phase?: TreatmentPhase;
  search?: string;
  treatmentPlanId?: string;
}

export interface RiskSortedPatientList {
  items: RiskSortedPatientItem[];
  total: number;
  page: number;
  limit: number;
}


export type TicketStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "RESOLVED_CLOSED"
  | "AUTO_CLOSED_BY_CHECKIN";

export type TicketPriority = "HIGH" | "CRITICAL";

export interface FaskesTicket {
  id: string;
  treatmentPlanId: string;
  facilityId: string;
  patientName: string;
  patientUsername: string;
  triggerSource: string;
  priority: TicketPriority;
  status: TicketStatus;
  assignedNakesId: string | null;
  pmoNotes: string;
  resolutionReason: string | null;
  resolutionNotes: string | null;
  openedAt: string;
  closedAt: string | null;
}

export type AlertSeverity = "INFO" | "WARNING" | "HIGH";

export interface FaskesAlert {
  id: string;
  facilityId: string;
  treatmentPlanId: string;
  patientName: string;
  alertType: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
}


export interface PatientHistoryItem {
  id: string;
  treatmentPlanId: string;
  eventType: string;
  previousState: string | null;
  newState: string | null;
  previousStreak: number | null;
  newStreak: number | null;
  actorRole: string;
  reasonOrSummary: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface PatientStatusHistoryList {
  items: PatientHistoryItem[];
  total: number;
  page: number;
  limit: number;
}

export type PatientHistoryResponse = PatientStatusHistoryList;

export interface PatientDetail extends RiskSortedPatientItem {
  userId?: string;
}

export type PatientPmo = NonNullable<RiskSortedPatientItem["pmo"]>;
