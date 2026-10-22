import { apiFetch } from "./client";

export type EducationCategory =
  | "ADHERENCE"
  | "SIDE_EFFECTS"
  | "NUTRITION"
  | "STIGMA"
  | "GENERAL";
export type EducationPhase = "INTENSIF" | "LANJUTAN";

export interface EducationItem {
  id: string;
  facilityId: string | null;
  title: string;
  summary: string;
  contentMarkdown: string;
  category: EducationCategory;
  phase: EducationPhase;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEducationDto {
  title: string;
  summary: string;
  contentMarkdown: string;
  category: EducationCategory;
  phase: EducationPhase;
  sortOrder: number;
}

export const educationApi = {
  // Untuk Pasien & PMO
  async getDaily(phase?: string): Promise<{ cards: EducationItem[] }> {
    const qs = phase ? `?phase=${encodeURIComponent(phase)}` : "";
    return apiFetch<{ cards: EducationItem[] }>(`/api/education/daily${qs}`, {
      method: "GET",
    });
  },

  // Untuk Nakes
  async getAll(): Promise<EducationItem[]> {
    return apiFetch<EducationItem[]>("/api/education", { method: "GET" });
  },

  async create(dto: CreateEducationDto): Promise<EducationItem> {
    return apiFetch<EducationItem>("/api/education", {
      method: "POST",
      body: JSON.stringify(dto),
    });
  },

  async update(
    id: string,
    dto: Partial<CreateEducationDto>,
  ): Promise<EducationItem> {
    return apiFetch<EducationItem>(`/api/education/${id}`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    });
  },

  async remove(id: string): Promise<{ success: boolean; message: string }> {
    return apiFetch<{ success: boolean; message: string }>(
      `/api/education/${id}`,
      {
        method: "DELETE",
      },
    );
  },
};
