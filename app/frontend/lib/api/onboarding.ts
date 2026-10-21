import { apiFetch } from "./client";
import type {
  OnboardingPayload,
  OnboardingCredentials,
  OcrOnboardingResult,
} from "../types/onboarding";

export const onboardingApi = {
  async onboard(dto: OnboardingPayload): Promise<OnboardingCredentials> {
    return apiFetch<OnboardingCredentials>("/api/faskes/onboarding", {
      method: "POST",
      body: JSON.stringify(dto),
    });
  },

  async ocrExtract(file: File | Blob): Promise<OcrOnboardingResult> {
    const formData = new FormData();
    formData.append("cardImage", file); // Pastikan key 'cardImage' sesuai backend
    return apiFetch<OcrOnboardingResult>("/api/faskes/onboarding/ocr", {
      method: "POST",
      body: formData,
    });
  },
};
