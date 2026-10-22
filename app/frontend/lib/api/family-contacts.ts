import { apiFetch } from "./client";
import type {
  FamilyContact,
  CreateFamilyContactPayload,
} from "../types/family-contact";

export const familyContactsApi = {
  async getAll(patientId: string): Promise<FamilyContact[]> {
    return apiFetch<FamilyContact[]>(
      `/api/patients/${patientId}/family-contacts`,
      {
        method: "GET",
      },
    );
  },
  async create(
    patientId: string,
    dto: CreateFamilyContactPayload,
  ): Promise<FamilyContact> {
    return apiFetch<FamilyContact>(
      `/api/patients/${patientId}/family-contacts`,
      {
        method: "POST",
        body: JSON.stringify(dto),
      },
    );
  },
  async remove(
    patientId: string,
    contactId: string,
  ): Promise<{ success: boolean; message: string }> {
    return apiFetch<{ success: boolean; message: string }>(
      `/api/patients/${patientId}/family-contacts/${contactId}`,
      {
        method: "DELETE",
      },
    );
  },
};
