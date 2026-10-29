export type {
  CreatePmoFollowUpDto,
  PmoFollowUpResponse,
  PmoPatientStatusList,
} from "@tiby/ts-shared";
export type { PmoFollowUpAction as PmoAction } from "@tiby/ts-shared";

/**
 * Frontend-only row for the PMO patient picker. The backend returns this shape
 * from `/api/pmo/patients` without publishing a contract schema for it, so it
 * stays here rather than pretending to be part of `@tiby/ts-shared`.
 */
export interface PmoPatient {
  treatmentPlanId: string;
  patientName: string;
  isLockedToday: boolean;
  todayVerdict: string | null;
  currentStreak: number;
  phase: string;
  consecutiveSilenceDays: number;
}
