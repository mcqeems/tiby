import { apiFetch } from "./client";

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
};
