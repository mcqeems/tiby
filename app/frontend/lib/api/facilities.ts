import { apiFetch } from "./client";
import type { FacilityItem, CreateFacilityDto } from "../types/facilities";

export const facilitiesApi = {
  async getAll(): Promise<FacilityItem[]> {
    return apiFetch<FacilityItem[]>("/api/facilities", {
      method: "GET",
    });
  },

  async create(dto: CreateFacilityDto): Promise<FacilityItem> {
    return apiFetch<FacilityItem>("/api/facilities", {
      method: "POST",
      body: JSON.stringify(dto),
    });
  },

  async update(
    id: string,
    dto: Partial<CreateFacilityDto>,
  ): Promise<FacilityItem> {
    return apiFetch<FacilityItem>(`/api/facilities/${id}`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    });
  },

  async remove(id: string): Promise<{ success: boolean; message?: string }> {
    return apiFetch(`/api/facilities/${id}`, {
      method: "DELETE",
    });
  },
};
