import { apiFetch } from "./client";
import type {
  NotificationTemplateList,
  SendSimulatedNotificationDto,
  SendSimulatedNotificationResponse,
} from "@tiby/ts-shared";

export const adminNotificationsApi = {
  async getTemplates(): Promise<NotificationTemplateList> {
    return apiFetch<NotificationTemplateList>(
      "/api/admin/notifications/templates",
      { method: "GET" },
    );
  },

  async send(
    dto: SendSimulatedNotificationDto,
  ): Promise<SendSimulatedNotificationResponse> {
    return apiFetch<SendSimulatedNotificationResponse>(
      "/api/admin/notifications/send",
      { method: "POST", body: JSON.stringify(dto) },
    );
  },
};
