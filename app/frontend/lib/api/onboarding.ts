import { apiFetch } from "./client";
import type {
  CreateOnboardingDto,
  OnboardingCredentials,
  OcrOnboardingDraft,
} from "../types/onboarding";

export const onboardingApi = {
  async onboard(dto: CreateOnboardingDto): Promise<OnboardingCredentials> {
    return apiFetch<OnboardingCredentials>("/api/faskes/onboarding", {
      method: "POST",
      body: JSON.stringify(dto),
    });
  },

  async ocrExtract(file: File | Blob): Promise<OcrOnboardingDraft> {
    const formData = new FormData();
    formData.append("cardImage", file); // Pastikan key 'cardImage' sesuai backend
    return apiFetch<OcrOnboardingDraft>("/api/faskes/onboarding/ocr", {
      method: "POST",
      body: formData,
    });
  },
};
