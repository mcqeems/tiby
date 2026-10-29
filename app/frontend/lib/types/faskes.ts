import type { PatientStatusHistoryList, RiskSortedPatientItem } from "@tiby/ts-shared";

export type {
  AlertSeverity,
  ListPatientsQuery,
  PatientState,
  PatientStatusHistoryList,
  RiskSortedPatientItem,
  RiskSortedPatientList,
  TicketPriority,
  TicketStatus,
  TreatmentPhase,
} from "@tiby/ts-shared";
export type { TicketDetail as FaskesTicket } from "@tiby/ts-shared";
export type { FacilityAlertDto as FaskesAlert } from "@tiby/ts-shared";
export type { PatientStatusHistoryItem as PatientHistoryItem } from "@tiby/ts-shared";

export type PatientHistoryResponse = PatientStatusHistoryList;

/** Patient detail is the list item plus the user id the detail route carries. */
export interface PatientDetail extends RiskSortedPatientItem {
  userId?: string;
}

export type PatientPmo = NonNullable<RiskSortedPatientItem["pmo"]>;
