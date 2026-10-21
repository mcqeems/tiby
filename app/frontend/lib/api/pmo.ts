import type {
  CreatePmoFollowUpDto,
  PmoFollowUpResponse,
  PmoPatientStatusList,
} from "@tiby/ts-shared";
import { apiFetch } from "./client";

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
