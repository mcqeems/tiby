import { apiFetch } from "./client";
import type { FacilityItem, CreateFacilityDto } from "../types/facilities";

export interface FacilityListResponse {
  items: FacilityItem[];
  total: number;
  page: number;
  limit: number;
}

export const facilitiesApi = {
  async list(
    params: { page?: number; limit?: number; search?: string } = {},
  ): Promise<FacilityListResponse> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set("page", String(params.page));
    if (params.limit) searchParams.set("limit", String(params.limit));
    if (params.search) searchParams.set("search", params.search);

    const qs = searchParams.toString();
    return apiFetch<FacilityListResponse>(
      `/api/facilities${qs ? `?${qs}` : ""}`,
      { method: "GET" },
    );
  },

  async get(id: string): Promise<FacilityItem> {
    return apiFetch<FacilityItem>(`/api/facilities/${id}`, { method: "GET" });
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
