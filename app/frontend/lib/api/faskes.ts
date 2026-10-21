import type {
  CreateOnboardingDto,
  ListPatientsQuery,
  OcrOnboardingDraft,
  OnboardingCredentials,
  PatientStatusHistoryList,
  RiskSortedPatientList,
} from "@tiby/ts-shared";
import { apiFetch } from "./client";

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

    const qs = searchParams.toString();
    return apiFetch<RiskSortedPatientList>(
      `/api/faskes/patients${qs ? `?${qs}` : ""}`,
      {
        method: "GET",
      },
    );
  },

  async getPatientHistory(
    treatmentPlanId: string,
    page = 1,
    limit = 20,
  ): Promise<PatientStatusHistoryList> {
    return apiFetch<PatientStatusHistoryList>(
      `/api/faskes/patients/${treatmentPlanId}/history?page=${page}&limit=${limit}`,
      {
        method: "GET",
      },
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
};
