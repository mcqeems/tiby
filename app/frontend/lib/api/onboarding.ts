import { apiFetch } from "./client";
import { compressForOcr } from "../ocr-image";
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
    // Shrink before sending: a phone photo is 2-3 MB and crosses two hops.
    // See lib/ocr-image.ts — this returns the original untouched when
    // re-encoding would not help or is not supported.
    const upload = await compressForOcr(file);

    const formData = new FormData();
    formData.append("cardImage", upload.blob, upload.filename); // key 'cardImage' must match backend
    return apiFetch<OcrOnboardingResult>("/api/faskes/onboarding/ocr", {
      method: "POST",
      body: formData,
    });
  },
};
