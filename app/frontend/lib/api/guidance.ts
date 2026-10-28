import { apiFetch } from "./client";
import type { GuidanceRequest, GuidanceResponse } from "@tiby/ts-shared";

export const guidanceApi = {
  /** `signal` lets the caller stop a long generation from the UI. */
  async ask(
    dto: GuidanceRequest,
    signal?: AbortSignal,
  ): Promise<GuidanceResponse> {
    return apiFetch<GuidanceResponse>("/api/guidance", {
      method: "POST",
      body: JSON.stringify(dto),
      signal,
    });
  },
};
