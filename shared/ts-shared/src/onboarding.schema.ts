import { z } from "zod";
import { ConsentScopes, PmoRelationshipSchema } from "./enums.js";

export const GrantConsentSchema = z.object({
  scopes: z.array(z.enum(ConsentScopes)).min(1),
  scheduleConfirmed: z.boolean(),
});
export type GrantConsentDto = z.infer<typeof GrantConsentSchema>;

export const RevokeConsentSchema = z.object({
  reason: z.string().optional(),
});
export type RevokeConsentDto = z.infer<typeof RevokeConsentSchema>;

export const ConsentStatusSchema = z.object({
  active: z.boolean(),
  grantedAt: z.string().nullable(),
  revokedAt: z.string().nullable(),
  scopes: z.array(z.string()),
  mustConfirmConsent: z.boolean(),
});
export type ConsentStatus = z.infer<typeof ConsentStatusSchema>;

export const PatientOnboardingInputSchema = z.object({
  fullName: z.string().min(2),
  username: z.string().min(3).max(30),
  whatsappNumber: z.string().min(8).max(20),
});

export const PmoOnboardingInputSchema = z.union([
  // Reference an already-registered PMO by user id — only the relationship is new.
  z.object({
    id: z.string().min(1),
    relationship: PmoRelationshipSchema,
  }),
  // Create a brand-new PMO account.
  z.object({
    fullName: z.string().min(2),
    username: z.string().min(3).max(30),
    whatsappNumber: z.string().min(8).max(20),
    relationship: PmoRelationshipSchema,
  }),
]);
export type PmoOnboardingInput = z.infer<typeof PmoOnboardingInputSchema>;

export const FamilyContactInputSchema = z.object({
  fullName: z.string().min(2),
  whatsappNumber: z.string().min(8).max(20),
  notifyOnEscalation: z.boolean().default(true),
});
export type FamilyContactInput = z.infer<typeof FamilyContactInputSchema>;

export const FamilyContactItemSchema = z.object({
  id: z.string().uuid(),
  treatmentPlanId: z.string().uuid(),
  fullName: z.string(),
  whatsappNumber: z.string(),
  whatsappVerified: z.boolean(),
  notifyOnEscalation: z.boolean(),
  createdAt: z.string(),
});
export type FamilyContactItem = z.infer<typeof FamilyContactItemSchema>;

export const CreateOnboardingSchema = z.object({
  patient: PatientOnboardingInputSchema,
  pmo: PmoOnboardingInputSchema,
  familyContact: FamilyContactInputSchema.optional(),
  regimenCode: z.string().min(1),
  dailyPillQuota: z.number().int().positive(),
  reminderTimeLocal: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Format HH:mm required"),
  timezone: z.string().default("Asia/Jakarta"),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format YYYY-MM-DD required"),
});
export type CreateOnboardingDto = z.infer<typeof CreateOnboardingSchema>;

export const OnboardingCredentialsSchema = z.object({
  treatmentPlanId: z.string().uuid(),
  patientUsername: z.string(),
  patientPassword: z.string(),
  pmoUsername: z.string(),
  pmoPassword: z.string().nullable(),
  patientUserId: z.string(),
  pmoUserId: z.string(),
  pmoCreated: z.boolean(),
});
export type OnboardingCredentials = z.infer<typeof OnboardingCredentialsSchema>;

export const OcrOnboardingDraftSchema = z.object({
  patientName: z.string().nullable(),
  regimenCode: z.string().nullable(),
  dailyPillQuota: z.number().int().positive().nullable(),
  startDate: z.string().nullable(),
  targetEndDate: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  rawText: z.string().optional(),
  fieldConfidence: z.record(z.string(), z.number()).optional(),
  uncertainties: z.array(z.string()).optional(),
});
export type OcrOnboardingDraft = z.infer<typeof OcrOnboardingDraftSchema>;
