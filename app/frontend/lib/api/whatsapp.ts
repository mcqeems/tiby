import { apiFetch } from "./client";
import type {
  WhatsappConnectChallenge,
  WhatsappConnectionStatus,
} from "@tiby/ts-shared";

export const whatsappApi = {
  async connect(dto: {
    phoneNumber: string;
    familyContactId?: string;
  }): Promise<WhatsappConnectChallenge> {
    return apiFetch<WhatsappConnectChallenge>("/api/whatsapp/connect", {
      method: "POST",
      body: JSON.stringify(dto),
    });
  },

  async getStatus(familyContactId?: string): Promise<WhatsappConnectionStatus> {
    const qs = familyContactId
      ? `?familyContactId=${encodeURIComponent(familyContactId)}`
      : "";
    return apiFetch<WhatsappConnectionStatus>(`/api/whatsapp/status${qs}`, {
      method: "GET",
    });
  },
};
