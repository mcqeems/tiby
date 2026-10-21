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
