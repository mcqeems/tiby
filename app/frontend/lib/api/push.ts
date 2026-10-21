import { apiFetch } from "./client";

export const pushApi = {
  async getVapidPublicKey(): Promise<{ publicKey: string }> {
    return apiFetch("/api/push/vapid-public-key", { method: "GET" });
  },

  async subscribe(subscription: PushSubscriptionJSON) {
    return apiFetch("/api/push/subscribe", {
      method: "POST",
      body: JSON.stringify(subscription),
    });
  },

  async unsubscribe(endpoint: string) {
    return apiFetch("/api/push/unsubscribe", {
      method: "POST",
      body: JSON.stringify({ endpoint }),
    });
  },

  async sendNotification(dto: {
    targetUserId: string;
    title: string;
    body: string;
    url: string;
    data?: Record<string, unknown>;
  }) {
    return apiFetch("/api/push/send", {
      method: "POST",
      body: JSON.stringify(dto),
    });
  },
};
