import type {
  DemoEndResponse,
  DemoEnterResponse,
  DemoRole,
  DemoStartResponse,
  DemoStatus,
} from "../types/demo";
import { apiFetch } from "./client";

export const demoApi = {
  async status(): Promise<DemoStatus> {
    return apiFetch<DemoStatus>("/api/demo/status", {
      method: "GET",
    });
  },

  async start(): Promise<DemoStartResponse> {
    return apiFetch<DemoStartResponse>("/api/demo/start", {
      method: "POST",
    });
  },

  async enter(role: DemoRole): Promise<DemoEnterResponse> {
    return apiFetch<DemoEnterResponse>("/api/demo/enter", {
      method: "POST",
      body: JSON.stringify({ role }),
    });
  },

  async end(): Promise<DemoEndResponse> {
    return apiFetch<DemoEndResponse>("/api/demo/end", {
      method: "POST",
    });
  },
};
