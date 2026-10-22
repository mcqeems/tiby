import { apiFetch } from "./client";

export interface EducationCardManaged {
  id: string;
  facilityId: string | null;
  title: string;
  summary: string;
  contentMarkdown: string;
  category: string;
  phase: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEducationCardPayload {
  title: string;
  summary: string;
  contentMarkdown: string;
  category: string;
  phase: "INTENSIF" | "LANJUTAN";
  sortOrder?: number;
  facilityId?: string | null;
}

export const educationApi = {
  async getDaily(phase?: string): Promise<{
    cards: Array<{
      id: string;
      title: string;
      summary: string;
      contentMarkdown: string;
      category: string;
      phase?: string;
    }>;
  }> {
    const qs = phase ? `?phase=${encodeURIComponent(phase)}` : "";
    return apiFetch(`/api/education/daily${qs}`, {
      method: "GET",
    });
  },

  async list(): Promise<EducationCardManaged[]> {
    return apiFetch<EducationCardManaged[]>("/api/education", { method: "GET" });
  },

  async create(dto: CreateEducationCardPayload): Promise<EducationCardManaged> {
    return apiFetch<EducationCardManaged>("/api/education", {
      method: "POST",
      body: JSON.stringify(dto),
    });
  },

  async update(
    id: string,
    dto: Partial<CreateEducationCardPayload>,
  ): Promise<EducationCardManaged> {
    return apiFetch<EducationCardManaged>(`/api/education/${id}`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    });
  },

  async remove(id: string): Promise<{ success: boolean; message: string }> {
    return apiFetch(`/api/education/${id}`, { method: "DELETE" });
  },
};
