import { apiFetch } from "./client";
import type {
  AiAudioExtractionResponse,
  AiAudioTranscriptResponse,
  CheckInVerdictResponse,
  CreateMissedCheckInReportDto,
  MissedCheckInReportItem,
  MissedCheckInSummaryResponse,
  SubmitCheckInDto,
  TextExtractRequest,
  CheckInHistoryResponse,
  CheckInHistoryItem,
} from "../types/check-in";

export const checkInsApi = {
  async extractAudio(
    audioBlob: Blob,
    treatmentPlanId?: string,
    checkInDate?: string,
  ): Promise<AiAudioTranscriptResponse> {
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");
    if (treatmentPlanId) {
      formData.append("treatmentPlanId", treatmentPlanId);
    }
    if (checkInDate) {
      formData.append("checkInDate", checkInDate);
    }

    return apiFetch<AiAudioTranscriptResponse>("/api/check-ins/audio-extract", {
      method: "POST",
      body: formData,
    });
  },

  async extractText(
    payload: TextExtractRequest,
  ): Promise<AiAudioExtractionResponse> {
    return apiFetch<AiAudioExtractionResponse>("/api/check-ins/text-extract", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async submit(dto: SubmitCheckInDto): Promise<CheckInVerdictResponse> {
    return apiFetch<CheckInVerdictResponse>("/api/check-ins", {
      method: "POST",
      body: JSON.stringify(dto),
    });
  },

  async getHistory(
    params: { page?: number; limit?: number } = {},
  ): Promise<CheckInHistoryResponse> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set("page", String(params.page));
    if (params.limit) searchParams.set("limit", String(params.limit));

    const qs = searchParams.toString();
    return apiFetch<CheckInHistoryResponse>(
      `/api/check-ins${qs ? `?${qs}` : ""}`,
      {
        method: "GET",
      },
    );
  },
  async getStatusForDate(
    treatmentPlanId?: string,
    dateStr?: string,
  ): Promise<CheckInHistoryItem | null> {
    const target = dateStr || new Date().toISOString().split("T")[0];
    const params = new URLSearchParams({
      from: target,
      to: target,
      limit: "1",
    });

    if (treatmentPlanId) {
      params.set("treatmentPlanId", treatmentPlanId);
    }

    const res = await apiFetch<CheckInHistoryResponse>(
      `/api/check-ins?${params.toString()}`,
    );

    return res.items?.[0] ?? null;
  },

  async getTodayStatus(
    treatmentPlanId?: string,
  ): Promise<CheckInHistoryItem | null> {
    return this.getStatusForDate(treatmentPlanId);
  },

  async getMissedReports(
    treatmentPlanId?: string,
  ): Promise<MissedCheckInSummaryResponse> {
    const params = new URLSearchParams();
    if (treatmentPlanId) params.set("treatmentPlanId", treatmentPlanId);
    const qs = params.toString();
    return apiFetch<MissedCheckInSummaryResponse>(
      `/api/check-ins/missed-reports${qs ? `?${qs}` : ""}`,
      { method: "GET" },
    );
  },

  async createMissedReport(
    payload: CreateMissedCheckInReportDto,
  ): Promise<MissedCheckInReportItem> {
    return apiFetch<MissedCheckInReportItem>("/api/check-ins/missed-reports", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
