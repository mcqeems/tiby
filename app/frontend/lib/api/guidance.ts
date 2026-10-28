import { apiFetch } from "./client";
import type { GuidanceRequest, GuidanceResponse } from "@tiby/ts-shared";

export const guidanceApi = {
  async ask(dto: GuidanceRequest): Promise<GuidanceResponse> {
    return apiFetch<GuidanceResponse>("/api/guidance", {
      method: "POST",
      body: JSON.stringify(dto),
    });
  },
};
