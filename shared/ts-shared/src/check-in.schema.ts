import { z } from "zod";
import {
  CheckInInputModeSchema,
  MedicationStatusSchema,
  SafetyVerdictSchema,
} from "./enums.js";
import { PaginationQuerySchema } from "./faskes.schema.js";

export const AiAudioExtractionResponseSchema = z.object({
  transcript: z.string(),
  medicationTaken: MedicationStatusSchema,
  pillsTakenCount: z.number().int().nonnegative().nullable(),
  symptoms: z.array(z.string()),
  intentToStopOrRefuse: z.boolean(),
  extractionConfidence: z.number().min(0).max(1),
  emotionalSentiment: z.string().optional(),
});
export type AiAudioExtractionResponse = z.infer<typeof AiAudioExtractionResponseSchema>;

export const TextExtractRequestSchema = z.object({
  editedTranscript: z.string().min(1),
  treatmentPlanId: z.uuid().optional(),
});
export type TextExtractRequest = z.infer<typeof TextExtractRequestSchema>;

export const ConfirmedCheckInFactsSchema = z.object({
  transcript: z.string().optional(),
  medicationStatus: MedicationStatusSchema,
  pillsTakenCount: z.number().int().nonnegative().nullable(),
  symptoms: z.array(z.string()).default([]),
  intentToStop: z.boolean().default(false),
  confidence: z.number().min(0).max(1).optional(),
});
export type ConfirmedCheckInFacts = z.infer<typeof ConfirmedCheckInFactsSchema>;

export const FallbackButtonsPayloadSchema = z.object({
  medicationStatus: MedicationStatusSchema,
  pillsTakenCount: z.number().int().nonnegative().nullable(),
  hasComplaints: z.boolean(),
  selectedComplaints: z.array(z.string()).default([]),
});
export type FallbackButtonsPayload = z.infer<typeof FallbackButtonsPayloadSchema>;

export const SubmitCheckInSchema = z.object({
  inputMode: CheckInInputModeSchema,
  treatmentPlanId: z.uuid().optional(),
  confirmedFacts: ConfirmedCheckInFactsSchema.optional(),
  fallbackButtons: FallbackButtonsPayloadSchema.optional(),
});
export type SubmitCheckInDto = z.infer<typeof SubmitCheckInSchema>;

export const CheckInEducationalCardSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  contentMarkdown: z.string(),
  category: z.string(),
});
export type CheckInEducationalCard = z.infer<typeof CheckInEducationalCardSchema>;

export const CheckInVerdictResponseSchema = z.object({
  checkInId: z.uuid(),
  verdict: SafetyVerdictSchema,
  isDoseFulfilled: z.boolean(),
  redoRequiredToday: z.boolean(),
  currentStreak: z.number().int().nonnegative(),
  message: z.string(),
  matchedRules: z.array(z.string()),
  educationalCard: CheckInEducationalCardSchema.optional(),
  submittedAt: z.string(),
});
export type CheckInVerdictResponse = z.infer<typeof CheckInVerdictResponseSchema>;

export const ListCheckInsQuerySchema = PaginationQuerySchema.extend({
  treatmentPlanId: z.uuid().optional(),
});
export type ListCheckInsQuery = z.infer<typeof ListCheckInsQuerySchema>;

/**
 * Read model for daily check-ins. Deliberately excludes the transcript and
 * the extracted facts so PMO never receives symptom detail (ADR zero-stigma /
 * transcript-blindness invariant).
 */
export const CheckInListItemSchema = z.object({
  id: z.uuid(),
  treatmentPlanId: z.uuid(),
  patientUserId: z.string(),
  patientName: z.string(),
  facilityId: z.uuid(),
  facilityName: z.string(),
  checkInDate: z.string(),
  attemptNumber: z.number().int().positive(),
  reportedByRole: z.string(),
  inputMode: z.string(),
  medicationStatus: MedicationStatusSchema,
  pillsTakenCount: z.number().int().nonnegative().nullable(),
  isDoseFulfilled: z.boolean(),
  sttConfidence: z.number().nullable(),
  submittedAt: z.string(),
  verdict: SafetyVerdictSchema.nullable(),
});
export type CheckInListItem = z.infer<typeof CheckInListItemSchema>;

export const CheckInListSchema = z.object({
  items: z.array(CheckInListItemSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});
export type CheckInList = z.infer<typeof CheckInListSchema>;

export const PmoPatientStatusItemSchema = z.object({
  treatmentPlanId: z.uuid(),
  patientName: z.string(),
  isLockedToday: z.boolean(),
  todayVerdict: SafetyVerdictSchema.nullable(),
  currentStreak: z.number().int().nonnegative(),
  phase: z.string(),
  consecutiveSilenceDays: z.number().int().nonnegative(),
});
export type PmoPatientStatusItem = z.infer<typeof PmoPatientStatusItemSchema>;

export const PmoPatientStatusListSchema = z.array(PmoPatientStatusItemSchema);
export type PmoPatientStatusList = z.infer<typeof PmoPatientStatusListSchema>;
