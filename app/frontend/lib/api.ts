import type {
  AiAudioExtractionResponse,
  AiAudioTranscriptResponse,
  CheckInVerdictResponse,
  SubmitCheckInDto,
  TextExtractRequest,
  ConsentStatus,
  PmoPatientStatusList,
  CreatePmoFollowUpDto,
  PmoFollowUpResponse,
  RiskSortedPatientList,
  ListPatientsQuery,
  PatientStatusHistoryList,
  CreateOnboardingDto,
  OnboardingCredentials,
  OcrOnboardingDraft,
} from "@tiby/ts-shared";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status?: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const headers = new Headers(options.headers || {});
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: "include", // Required for Better-Auth session cookies
  });

  const contentType = res.headers.get("content-type") || "";
  let data: unknown = null;
  if (contentType.includes("application/json")) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    const errorObj = typeof data === "object" && data !== null ? (data as Record<string, unknown>) : null;
    const code = (errorObj?.code as string) || (res.status === 401 ? "UNAUTHORIZED" : "SERVER_ERROR");
    const message =
      (errorObj?.message as string) ||
      (typeof data === "string" ? data : `Request gagal dengan status ${res.status}`);
    throw new ApiError(code, message, res.status, errorObj?.details);
  }

  return data as T;
}

export const api = {
  // Check-In APIs
  checkIns: {
    async extractAudio(
      audioBlob: Blob,
      treatmentPlanId?: string,
    ): Promise<AiAudioTranscriptResponse> {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");
      if (treatmentPlanId) {
        formData.append("treatmentPlanId", treatmentPlanId);
      }

      return apiFetch<AiAudioTranscriptResponse>(
        "/api/check-ins/audio-extract",
        {
          method: "POST",
          body: formData,
        },
      );
    },

    async extractText(
      payload: TextExtractRequest,
    ): Promise<AiAudioExtractionResponse> {
      return apiFetch<AiAudioExtractionResponse>(
        "/api/check-ins/text-extract",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );
    },

    async submit(dto: SubmitCheckInDto): Promise<CheckInVerdictResponse> {
      return apiFetch<CheckInVerdictResponse>("/api/check-ins", {
        method: "POST",
        body: JSON.stringify(dto),
      });
    },
  },

  // Consent APIs
  consent: {
    async getStatus(): Promise<ConsentStatus> {
      return apiFetch<ConsentStatus>("/api/consent", {
        method: "GET",
      });
    },

    async grant(
      scopes = [
        "PATIENT_DATA_SHARE",
        "PMO_STATUS_ONLY",
        "STT_AUDIO_PROCESSING",
      ],
      scheduleConfirmed = true,
    ): Promise<ConsentStatus> {
      return apiFetch<ConsentStatus>("/api/consent", {
        method: "POST",
        body: JSON.stringify({
          scopes,
          scheduleConfirmed,
        }),
      });
    },

    async revoke(reason = "Dicabut oleh pasien"): Promise<ConsentStatus> {
      return apiFetch<ConsentStatus>("/api/consent", {
        method: "DELETE",
        body: JSON.stringify({ reason }),
      });
    },
  },

  // PMO APIs
  pmo: {
    async getPatients(): Promise<PmoPatientStatusList> {
      return apiFetch<PmoPatientStatusList>("/api/pmo/patients", {
        method: "GET",
      });
    },

    async createFollowUp(
      patientId: string,
      payload: CreatePmoFollowUpDto,
    ): Promise<PmoFollowUpResponse> {
      return apiFetch<PmoFollowUpResponse>(
        `/api/pmo/patients/${patientId}/follow-up`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );
    },
  },

  // Faskes & Nakes APIs
  faskes: {
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
  },

  // Education APIs
  education: {
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
  },

  // Users APIs
  users: {
    async getMe(): Promise<unknown> {
      return apiFetch("/api/users/me", {
        method: "GET",
      });
    },

    async getAll(): Promise<
      Array<{
        id: string;
        username: string;
        email?: string;
        name: string;
        role: string;
        facilityId?: string | null;
      }>
    > {
      return apiFetch("/api/users", {
        method: "GET",
      });
    },

    /**
     * Ganti password sendiri — butuh password lama (untuk Pasien & PMO).
     * Endpoint: POST /api/users/change-password [ALL]
     */
    async changePassword(
      currentPassword: string,
      newPassword: string,
    ): Promise<{ success: boolean; message: string }> {
      return apiFetch("/api/users/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
    },

    /**
     * Reset password user lain tanpa perlu tahu password lama (untuk NAKES).
     * Endpoint: POST /api/users/:id/reset-password [NAKES]
     */
    async resetPassword(
      userId: string,
      newPassword: string,
    ): Promise<{ success: boolean; message: string }> {
      return apiFetch(`/api/users/${userId}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ newPassword }),
      });
    },
  },
};
