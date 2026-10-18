import { z } from "zod";
import {
  AlertSeveritySchema,
  FacilityAlertTypeSchema,
  TicketPrioritySchema,
  TicketStatusSchema,
  TicketTriggerSourceSchema,
  PmoFollowUpActionSchema,
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

export const CloseTicketSchema = z.object({
  resolutionReason: z.string().min(1),
  resolutionNotes: z.string().min(1),
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
  additionalFamilyContact: z
    .object({
      fullName: z.string().min(2),
      whatsappNumber: z.string().min(8),
    })
    .optional(),
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
  category: z.string(),
  phase: z.string(),
});
export type EducationCard = z.infer<typeof EducationCardSchema>;

export const EducationCardListSchema = z.object({
  cards: z.array(EducationCardSchema),
});
export type EducationCardList = z.infer<typeof EducationCardListSchema>;
