import { apiFetch } from "./client";
import type { StatsResponse } from "../types/stats";

export const statsApi = {
  async getStats(): Promise<StatsResponse> {
    return apiFetch<StatsResponse>("/api/stats", {
      method: "GET",
    });
  },
};
