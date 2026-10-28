import { apiFetch } from "./client";
import type {
  PushSubscriptionPayload,
  VapidPublicKeyResponse,
} from "@tiby/ts-shared";

export const pushApi = {
  async getVapidPublicKey(): Promise<VapidPublicKeyResponse> {
    return apiFetch<VapidPublicKeyResponse>("/api/push/vapid-public-key", {
      method: "GET",
    });
  },

  async subscribe(subscription: PushSubscriptionPayload) {
    return apiFetch<{ success: boolean; message: string }>(
      "/api/push/subscribe",
      {
        method: "POST",
        body: JSON.stringify(subscription),
      },
    );
  },

  async unsubscribe(endpoint: string) {
    return apiFetch<{ success: boolean; message: string }>(
      "/api/push/unsubscribe",
      {
        method: "POST",
        body: JSON.stringify({ endpoint }),
      },
    );
  },
};
