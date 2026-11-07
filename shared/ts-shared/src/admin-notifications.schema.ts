import { z } from "zod";
import { UserRoleSchema } from "./enums.js";
import { NotificationSeveritySchema } from "./notifications.schema.js";

/**
 * Admin notification simulator. The admin picks recipients, one or more
 * channels and a message (custom or a template) and the API reports the
 * delivery status per recipient per channel.
 */

export const SimulationChannels = ["PUSH", "WHATSAPP", "ALERT"] as const;
export const SimulationChannelSchema = z.enum(SimulationChannels);
export type SimulationChannel = z.infer<typeof SimulationChannelSchema>;

export const SimulationDeliveryStatuses = [
  "DELIVERED",
  "NO_SUBSCRIPTION",
  "SKIPPED_UNVERIFIED",
  "SKIPPED_WAHA_DISABLED",
  "NOT_APPLICABLE",
  "FAILED",
] as const;
export const SimulationDeliveryStatusSchema = z.enum(
  SimulationDeliveryStatuses,
);
export type SimulationDeliveryStatus = z.infer<
  typeof SimulationDeliveryStatusSchema
>;

export const NotificationTemplateSources = ["SYSTEM", "PRESET"] as const;
export const NotificationTemplateSourceSchema = z.enum(
  NotificationTemplateSources,
);
export type NotificationTemplateSource = z.infer<
  typeof NotificationTemplateSourceSchema
>;

export const NotificationTemplateSchema = z.object({
  key: z.string(),
  source: NotificationTemplateSourceSchema,
  title: z.string(),
  body: z.string(),
  severity: NotificationSeveritySchema,
});
export type NotificationTemplate = z.infer<typeof NotificationTemplateSchema>;

export const NotificationTemplateListSchema = z.object({
  items: z.array(NotificationTemplateSchema),
});
export type NotificationTemplateList = z.infer<
  typeof NotificationTemplateListSchema
>;

export const SendSimulatedNotificationSchema = z.object({
  recipientUserIds: z
    .array(z.string().min(1))
    .min(1, "At least one recipient is required")
    .max(50, "At most 50 recipients per send"),
  channels: z
    .array(SimulationChannelSchema)
    .min(1, "At least one channel is required"),
  templateKey: z.string().max(100).optional(),
  title: z.string().min(1, "Title is required").max(120),
  message: z.string().min(1, "Message is required").max(1000),
  severity: NotificationSeveritySchema.default("INFO"),
});
export type SendSimulatedNotificationDto = z.infer<
  typeof SendSimulatedNotificationSchema
>;

export const SimulationChannelResultSchema = z.object({
  channel: SimulationChannelSchema,
  status: SimulationDeliveryStatusSchema,
  /** Human-readable reason for a skipped or failed delivery. */
  detail: z.string().nullable(),
});
export type SimulationChannelResult = z.infer<
  typeof SimulationChannelResultSchema
>;

export const SimulationRecipientResultSchema = z.object({
  userId: z.string(),
  username: z.string().nullable(),
  name: z.string(),
  role: UserRoleSchema,
  channels: z.array(SimulationChannelResultSchema),
});
export type SimulationRecipientResult = z.infer<
  typeof SimulationRecipientResultSchema
>;

export const SendSimulatedNotificationResponseSchema = z.object({
  summary: z.object({
    recipients: z.number().int(),
    delivered: z.number().int(),
    skipped: z.number().int(),
    failed: z.number().int(),
  }),
  results: z.array(SimulationRecipientResultSchema),
});
export type SendSimulatedNotificationResponse = z.infer<
  typeof SendSimulatedNotificationResponseSchema
>;
