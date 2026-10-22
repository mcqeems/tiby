import { z } from "zod";
import {
  AlertSeveritySchema,
  EducationCategorySchema,
  FacilityAlertTypeSchema,
  TicketPrioritySchema,
  TicketStatusSchema,
  TicketTriggerSourceSchema,
  TicketResolutionReasonSchema,
  PmoFollowUpActionSchema,
  TreatmentPhaseSchema,
} from "./enums.js";

export const ListTicketsQuerySchema = z.object({
  status: TicketStatusSchema.optional(),
  priority: TicketPrioritySchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type ListTicketsQuery = z.infer<typeof ListTicketsQuerySchema>;

export const TicketDetailSchema = z.object({
  id: z.string().uuid(),
  treatmentPlanId: z.string().uuid(),
  facilityId: z.string().uuid(),
  patientName: z.string(),
  patientUsername: z.string(),
  triggerSource: TicketTriggerSourceSchema,
  priority: TicketPrioritySchema,
  status: TicketStatusSchema,
  assignedNakesId: z.string().nullable(),
  pmoNotes: z.string().nullable(),
  resolutionReason: z.string().nullable(),
  resolutionNotes: z.string().nullable(),
  openedAt: z.string(),
  closedAt: z.string().nullable(),
});
export type TicketDetail = z.infer<typeof TicketDetailSchema>;

export const TicketListResponseSchema = z.object({
  items: z.array(TicketDetailSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});
export type TicketListResponse = z.infer<typeof TicketListResponseSchema>;

export const CreateTicketSchema = z.object({
  treatmentPlanId: z.string().uuid().optional(),
  patientUserId: z.string().optional(),
  priority: TicketPrioritySchema.default("HIGH"),
  reason: z.string().min(1, "Reason is required"),
});
export type CreateTicketDto = z.infer<typeof CreateTicketSchema>;

export const CloseTicketSchema = z.object({
  resolutionReason: TicketResolutionReasonSchema,
  resolutionNotes: z.string().min(1, "Resolution notes are required"),
});
export type CloseTicketDto = z.infer<typeof CloseTicketSchema>;

export const ListAlertsQuerySchema = z.object({
  unreadOnly: z.coerce.boolean().default(false),
  severity: AlertSeveritySchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type ListAlertsQuery = z.infer<typeof ListAlertsQuerySchema>;

export const FacilityAlertSchema = z.object({
  id: z.string().uuid(),
  facilityId: z.string().uuid(),
  treatmentPlanId: z.string().uuid(),
  patientName: z.string(),
  alertType: FacilityAlertTypeSchema,
  severity: AlertSeveritySchema,
  title: z.string(),
  message: z.string(),
  isRead: z.boolean(),
  createdAt: z.string(),
  readAt: z.string().nullable(),
});
export type FacilityAlertDto = z.infer<typeof FacilityAlertSchema>;

export const FacilityAlertListSchema = z.object({
  items: z.array(FacilityAlertSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});
export type FacilityAlertList = z.infer<typeof FacilityAlertListSchema>;

export const CreatePmoFollowUpSchema = z.object({
  actionTaken: PmoFollowUpActionSchema,
  notes: z.string().min(1),
});
export type CreatePmoFollowUpDto = z.infer<typeof CreatePmoFollowUpSchema>;

export const PmoFollowUpResponseSchema = z.object({
  success: z.boolean(),
  followUpId: z.string().uuid(),
  notes: z.string(),
});
export type PmoFollowUpResponse = z.infer<typeof PmoFollowUpResponseSchema>;

export const EducationQuerySchema = z.object({
  phase: z.enum(["INTENSIF", "LANJUTAN"]).optional(),
});
export type EducationQuery = z.infer<typeof EducationQuerySchema>;

export const EducationCardSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  contentMarkdown: z.string(),
  category: EducationCategorySchema,
  phase: z.string(),
});
export type EducationCard = z.infer<typeof EducationCardSchema>;

export const EducationCardListSchema = z.object({
  cards: z.array(EducationCardSchema),
});
export type EducationCardList = z.infer<typeof EducationCardListSchema>;

export const CreateEducationCardSchema = z.object({
  title: z.string().min(3).max(255),
  summary: z.string().min(3).max(500),
  contentMarkdown: z.string().min(1),
  category: EducationCategorySchema,
  phase: TreatmentPhaseSchema,
  sortOrder: z.number().int().min(0).default(0),
  // Omit or null to create a global card (ADMIN only).
  facilityId: z.uuid().nullable().optional(),
});
export type CreateEducationCardDto = z.infer<typeof CreateEducationCardSchema>;

export const UpdateEducationCardSchema = z
  .object({
    title: z.string().min(3).max(255).optional(),
    summary: z.string().min(3).max(500).optional(),
    contentMarkdown: z.string().min(1).optional(),
    category: EducationCategorySchema.optional(),
    phase: TreatmentPhaseSchema.optional(),
    sortOrder: z.number().int().min(0).optional(),
    facilityId: z.uuid().nullable().optional(),
  })
  .refine((o) => Object.keys(o).length > 0, {
    message: "At least one field must be provided",
  });
export type UpdateEducationCardDto = z.infer<typeof UpdateEducationCardSchema>;

export const EducationCardManagedSchema = EducationCardSchema.extend({
  facilityId: z.string().nullable(),
  sortOrder: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type EducationCardManaged = z.infer<typeof EducationCardManagedSchema>;
