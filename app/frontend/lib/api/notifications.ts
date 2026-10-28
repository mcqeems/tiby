import { apiFetch } from "./client";
import type {
  UserNotification,
  UserNotificationList,
} from "@tiby/ts-shared";

export const notificationsApi = {
  async list(
    params: { page?: number; limit?: number; unreadOnly?: boolean } = {},
  ): Promise<UserNotificationList> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set("page", String(params.page));
    if (params.limit) searchParams.set("limit", String(params.limit));
    if (params.unreadOnly) searchParams.set("unreadOnly", "true");

    const qs = searchParams.toString();
    return apiFetch<UserNotificationList>(
      `/api/notifications${qs ? `?${qs}` : ""}`,
      { method: "GET" },
    );
  },

  async markRead(id: string): Promise<UserNotification> {
    return apiFetch<UserNotification>(`/api/notifications/${id}/read`, {
      method: "PATCH",
    });
  },
};
