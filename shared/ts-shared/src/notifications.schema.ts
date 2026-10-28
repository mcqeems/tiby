import { z } from "zod";
import { NotificationTriggerCircumstanceSchema } from "./enums.js";
import { PaginationQuerySchema } from "./faskes.schema.js";

export const NotificationSeveritySchema = z.enum(["INFO", "WARNING", "HIGH"]);
export type NotificationSeverity = z.infer<typeof NotificationSeveritySchema>;

export const ListNotificationsQuerySchema = PaginationQuerySchema.extend({
  unreadOnly: z.stringbool().default(false),
});
export type ListNotificationsQuery = z.infer<
  typeof ListNotificationsQuerySchema
>;

export const UserNotificationSchema = z.object({
  id: z.uuid(),
  treatmentPlanId: z.uuid().nullable(),
  type: NotificationTriggerCircumstanceSchema,
  severity: NotificationSeveritySchema,
  title: z.string(),
  message: z.string(),
  isRead: z.boolean(),
  createdAt: z.string(),
  readAt: z.string().nullable(),
});
export type UserNotification = z.infer<typeof UserNotificationSchema>;

export const UserNotificationListSchema = z.object({
  items: z.array(UserNotificationSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});
export type UserNotificationList = z.infer<typeof UserNotificationListSchema>;
