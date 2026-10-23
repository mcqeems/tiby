import type { ConsentStatus } from "../types/consent";
import { apiFetch } from "./client";

export const consentApi = {
  async getStatus(): Promise<ConsentStatus> {
    return apiFetch<ConsentStatus>("/api/consent", {
      method: "GET",
    });
  },

  async grant(
    scopes = ["PATIENT_DATA_SHARE", "PMO_STATUS_ONLY", "STT_AUDIO_PROCESSING"],
    scheduleConfirmed = true,
  ): Promise<ConsentStatus> {
    return apiFetch<ConsentStatus>("/api/consent", {
      method: "POST",
      body: JSON.stringify({
        scopes,
        scheduleConfirmed,
      }),
    });
  },

  async revoke(reason = "Dicabut oleh pasien"): Promise<ConsentStatus> {
    return apiFetch<ConsentStatus>("/api/consent", {
      method: "DELETE",
      body: JSON.stringify({ reason }),
    });
  },
};
