import { z } from "zod";
import {
  PatientStateSchema,
  PatientStatusEventTypeSchema,
  TreatmentPhaseSchema,
} from "./enums.js";

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

export const ListPatientsQuerySchema = PaginationQuerySchema.extend({
  state: PatientStateSchema.optional(),
  phase: TreatmentPhaseSchema.optional(),
  search: z.string().optional(),
  /** Exposed so a patient detail page can fetch one plan without scanning pages. */
  treatmentPlanId: z.uuid().optional(),
});
export type ListPatientsQuery = z.infer<typeof ListPatientsQuerySchema>;

export const PatientHistoryQuerySchema = PaginationQuerySchema.extend({
  eventType: PatientStatusEventTypeSchema.optional(),
});
export type PatientHistoryQuery = z.infer<typeof PatientHistoryQuerySchema>;

export const RiskSortedPatientItemSchema = z.object({
  id: z.uuid(),
  patientUserId: z.string(),
  patientName: z.string(),
  username: z.string(),
  patientState: PatientStateSchema,
  phase: TreatmentPhaseSchema,
  regimenCode: z.string(),
  dailyPillQuota: z.number(),
  currentStreak: z.number(),
  consecutiveSilenceDays: z.number(),
  riskScore: z.number(),
  lastCheckInDate: z.string().nullable(),
  todayCheckInLocked: z.boolean(),
  startDate: z.string(),
  targetEndDate: z.string(),
  whatsappVerified: z.boolean(),
  pushSubscribed: z.boolean(),
  pmo: z
    .object({
      userId: z.string(),
      fullName: z.string(),
      username: z.string(),
      whatsappNumber: z.string().nullable(),
      relationship: z.string(),
      isPrimary: z.boolean(),
    })
    .nullable(),
});
export type RiskSortedPatientItem = z.infer<typeof RiskSortedPatientItemSchema>;

export const RiskSortedPatientListSchema = z.object({
  items: z.array(RiskSortedPatientItemSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});
export type RiskSortedPatientList = z.infer<typeof RiskSortedPatientListSchema>;

export const UpdatePatientStateSchema = z.object({
  targetState: PatientStateSchema,
  reason: z.string().min(1),
});
export type UpdatePatientStateDto = z.infer<typeof UpdatePatientStateSchema>;

export const TreatmentPlanSummarySchema = z.object({
  id: z.uuid(),
  patientUserId: z.string(),
  patientState: PatientStateSchema,
  phase: TreatmentPhaseSchema,
  regimenCode: z.string(),
  currentStreak: z.number(),
  consecutiveSilenceDays: z.number(),
  riskScore: z.number(),
  updatedAt: z.string(),
});
export type TreatmentPlanSummary = z.infer<typeof TreatmentPlanSummarySchema>;

export const PatientStatusHistoryItemSchema = z.object({
  id: z.uuid(),
  treatmentPlanId: z.uuid(),
  eventType: PatientStatusEventTypeSchema,
  previousState: z.string().nullable(),
  newState: z.string().nullable(),
  previousStreak: z.number().nullable(),
  newStreak: z.number().nullable(),
  actorRole: z.string(),
  reasonOrSummary: z.string(),
  metadata: z.record(z.string(), z.any()).nullable(),
  createdAt: z.string(),
});
export type PatientStatusHistoryItem = z.infer<
  typeof PatientStatusHistoryItemSchema
>;

export const PatientStatusHistoryListSchema = z.object({
  items: z.array(PatientStatusHistoryItemSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});
export type PatientStatusHistoryList = z.infer<
  typeof PatientStatusHistoryListSchema
>;
