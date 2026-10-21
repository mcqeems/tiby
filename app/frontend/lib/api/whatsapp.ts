import { apiFetch } from "./client";

export const whatsappApi = {
  async connect(dto: { phoneNumber: string; familyContactId?: string }) {
    return apiFetch("/api/whatsapp/connect", {
      method: "POST",
      body: JSON.stringify(dto),
    });
  },

  async getStatus() {
    return apiFetch("/api/whatsapp/status", { method: "GET" });
  },
};
