import type {
  AiAudioExtractionResponse,
  AiAudioTranscriptResponse,
  CheckInVerdictResponse,
  SubmitCheckInDto,
  TextExtractRequest,
} from "@tiby/ts-shared";
import { apiFetch } from "./client";

export const checkInsApi = {
  async extractAudio(
    audioBlob: Blob,
    treatmentPlanId?: string,
  ): Promise<AiAudioTranscriptResponse> {
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");
    if (treatmentPlanId) {
      formData.append("treatmentPlanId", treatmentPlanId);
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
};
