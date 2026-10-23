import { apiFetch } from "./client";
import type {
  PmoPatientStatusList,
  CreatePmoFollowUpDto,
  PmoFollowUpResponse,
} from "../types/pmo";

export const pmoApi = {
  async getPatients(): Promise<PmoPatientStatusList> {
    return apiFetch<PmoPatientStatusList>("/api/pmo/patients", {
      method: "GET",
    });
  },

  async createFollowUp(
    patientId: string,
    payload: CreatePmoFollowUpDto,
  ): Promise<PmoFollowUpResponse> {
    return apiFetch<PmoFollowUpResponse>(
      `/api/pmo/patients/${patientId}/follow-up`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },
};
