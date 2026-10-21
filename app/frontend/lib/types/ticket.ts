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

export interface CreateTicketPayload {
  treatmentPlanId: string;
  priority?: TicketPriority;
  reason: string;
}

export interface CloseTicketPayload {
  resolutionReason: string;
  resolutionNotes: string;
}
