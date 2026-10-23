import { apiFetch } from "./client";

import type {
  ListPatientsQuery,
  RiskSortedPatientList,
  PatientStatusHistoryList,
  FaskesTicket,
  FaskesAlert,
} from "../types/faskes";

import type {
  CreateOnboardingDto,
  OcrOnboardingDraft,
  OnboardingCredentials,
} from "../types/onboarding";

export const faskesApi = {
  async getPatients(
    query: Partial<ListPatientsQuery> = {},
  ): Promise<RiskSortedPatientList> {
    const searchParams = new URLSearchParams();
    if (query.page) searchParams.set("page", String(query.page));
    if (query.limit) searchParams.set("limit", String(query.limit));
    if (query.state) searchParams.set("state", query.state);
    if (query.phase) searchParams.set("phase", query.phase);
    if (query.search) searchParams.set("search", query.search);
    if (query.treatmentPlanId)
      searchParams.set("treatmentPlanId", query.treatmentPlanId);

    const qs = searchParams.toString();
    return apiFetch<RiskSortedPatientList>(
      `/api/faskes/patients${qs ? `?${qs}` : ""}`,
      { method: "GET" },
    );
  },

  async getPatientHistory(
    treatmentPlanId: string,
    page = 1,
    limit = 20,
  ): Promise<PatientStatusHistoryList> {
    return apiFetch<PatientStatusHistoryList>(
      `/api/faskes/patients/${treatmentPlanId}/history?page=${page}&limit=${limit}`,
      { method: "GET" },
    );
  },

  async onboard(dto: CreateOnboardingDto): Promise<OnboardingCredentials> {
    return apiFetch<OnboardingCredentials>("/api/faskes/onboarding", {
      method: "POST",
      body: JSON.stringify(dto),
    });
  },

  async ocrExtract(file: File | Blob): Promise<OcrOnboardingDraft> {
    const formData = new FormData();
    formData.append("cardImage", file);
    return apiFetch<OcrOnboardingDraft>("/api/faskes/onboarding/ocr", {
      method: "POST",
      body: formData,
    });
  },

  async getTickets(
    params: {
      status?: string;
      priority?: string;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{
    items: FaskesTicket[];
    total: number;
    page: number;
    limit: number;
  }> {
    const searchParams = new URLSearchParams();
    if (params.status) searchParams.set("status", params.status);
    if (params.priority) searchParams.set("priority", params.priority);
    if (params.page) searchParams.set("page", String(params.page));
    if (params.limit) searchParams.set("limit", String(params.limit));

    const qs = searchParams.toString();
    return apiFetch<{
      items: FaskesTicket[];
      total: number;
      page: number;
      limit: number;
    }>(`/api/faskes/tickets${qs ? `?${qs}` : ""}`, { method: "GET" });
  },

  async getTicketById(id: string): Promise<FaskesTicket> {
    return apiFetch<FaskesTicket>(`/api/faskes/tickets/${id}`, {
      method: "GET",
    });
  },

  async createTicket(dto: {
    treatmentPlanId: string;
    priority?: "HIGH" | "CRITICAL";
    reason: string;
  }): Promise<FaskesTicket> {
    return apiFetch<FaskesTicket>("/api/faskes/tickets", {
      method: "POST",
      body: JSON.stringify(dto),
    });
  },

  async closeTicket(
    id: string,
    dto: { resolutionReason: string; resolutionNotes: string },
  ): Promise<FaskesTicket> {
    return apiFetch<FaskesTicket>(`/api/faskes/tickets/${id}/close`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    });
  },

  async getAlerts(
    params: {
      unreadOnly?: boolean;
      severity?: string;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{
    items: FaskesAlert[];
    total: number;
    page: number;
    limit: number;
  }> {
    const searchParams = new URLSearchParams();
    if (params.unreadOnly !== undefined)
      searchParams.set("unreadOnly", String(params.unreadOnly));
    if (params.severity) searchParams.set("severity", params.severity);
    if (params.page) searchParams.set("page", String(params.page));
    if (params.limit) searchParams.set("limit", String(params.limit));

    const qs = searchParams.toString();
    return apiFetch<{
      items: FaskesAlert[];
      total: number;
      page: number;
      limit: number;
    }>(`/api/faskes/alerts${qs ? `?${qs}` : ""}`, { method: "GET" });
  },

  async markAlertAsRead(id: string): Promise<FaskesAlert> {
    return apiFetch<FaskesAlert>(`/api/faskes/alerts/${id}/read`, {
      method: "PATCH",
    });
  },
};
