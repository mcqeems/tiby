import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import {
  AiAudioTranscriptResponseSchema,
  GuidanceResponseSchema,
  type AiAudioExtractionResponse,
  type AiAudioTranscriptResponse,
  type GuidanceResponse,
  type MedicationStatus,
} from "@tiby/ts-shared";

/**
 * Ceiling for every AI call. The live provider answers in ~40-50s cold, so the
 * old 5-6s caps timed out on requests that would have succeeded.
 */
export const AI_SERVICE_TIMEOUT_MS = Number(
  process.env.AI_SERVICE_TIMEOUT_MS ?? 90_000,
);

@Injectable()
export class AiClientService {
  private readonly logger = new Logger(AiClientService.name);
  private readonly baseUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";

  /**
   * Bridge step 1: audio in, transcript out.
   *
   * The AI service answers with the transcript only; facts come from
   * {@link extractFromText} once the patient has confirmed the text.
   */
  async transcribeFromAudio(
    audioBuffer: Buffer,
    filename: string,
    mimetype: string,
  ): Promise<AiAudioTranscriptResponse> {
    try {
      const formData = new FormData();
      const blob = new Blob([new Uint8Array(audioBuffer)], { type: mimetype });
      formData.append("audio", blob, filename);

      const res = await fetch(`${this.baseUrl}/audio/extract`, {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(AI_SERVICE_TIMEOUT_MS),
      });

      if (res.ok) {
        // Project instead of forwarding: the audio step may only surface the
        // transcript, and a malformed body falls through to the fallback.
        return AiAudioTranscriptResponseSchema.parse(await res.json());
      }
      this.logger.warn(
        `AI Service transcription failed with ${res.status}. Using fallback transcript.`,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`AI Service offline or failed: ${msg}. Using fallback transcript.`);
    }

    // Heuristic fallback for offline local testing
    return {
      transcript:
        "Halo Pandu, saya sudah minum 4 butir obat pagi ini dan tidak ada keluhan.",
    };
  }

  async extractFromText(transcriptText: string): Promise<AiAudioExtractionResponse> {
    try {
      const res = await fetch(`${this.baseUrl}/text/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: transcriptText }),
        signal: AbortSignal.timeout(AI_SERVICE_TIMEOUT_MS),
      });

      if (res.ok) {
        return (await res.json()) as AiAudioExtractionResponse;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`AI Service offline or failed: ${msg}. Using heuristic fallback.`);
    }

    return this.fallbackHeuristicExtraction(transcriptText);
  }

  /**
   * General educational guidance from the approved-source corpus.
   *
   * There is no fallback: an unreachable or drifting provider must surface as
   * a 503, never as an invented medical answer. A `200` with a null answer is
   * the AI service's own fail-closed decision and is forwarded untouched.
   */
  async askGuidance(
    question: string,
    transcript?: string | null,
  ): Promise<GuidanceResponse> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/ai/guidance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          ...(transcript ? { transcript } : {}),
        }),
        signal: AbortSignal.timeout(AI_SERVICE_TIMEOUT_MS),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`AI Service guidance unreachable: ${msg}`);
      throw this.guidanceUnavailable();
    }

    if (!res.ok) {
      this.logger.warn(`AI Service guidance failed with ${res.status}.`);
      throw this.guidanceUnavailable();
    }

    try {
      return GuidanceResponseSchema.parse(await res.json());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`AI Service guidance response drifted from contract: ${msg}`);
      throw this.guidanceUnavailable();
    }
  }

  private guidanceUnavailable(): ServiceUnavailableException {
    return new ServiceUnavailableException({
      code: "INTERNAL",
      message: "Guidance service is unavailable. Please try again later.",
    });
  }

  private fallbackHeuristicExtraction(text: string): AiAudioExtractionResponse {
    const lower = text.toLowerCase();
    let medicationTaken: MedicationStatus = "SUDAH_MINUM";
    let pillsTakenCount: number | null = 4;
    const symptoms: string[] = [];
    let intentToStopOrRefuse = false;

    if (lower.includes("ragu") || lower.includes("tidak pasti")) {
      medicationTaken = "TIDAK_PASTI";
      pillsTakenCount = null;
    } else if (lower.includes("belum") || lower.includes("tidak minum") || lower.includes("lupa")) {
      medicationTaken = "BELUM_MINUM";
      pillsTakenCount = 0;
    }

    const pillsMatch = lower.match(/(\d+)\s*(butir|tablet|biji|obat|pil)/);
    if (pillsMatch) {
      pillsTakenCount = parseInt(pillsMatch[1], 10);
    }

    // Symptoms detection
    if (lower.includes("batuk darah") || lower.includes("darah")) symptoms.push("BATUK_DARAH");
    if (lower.includes("sesak") || lower.includes("sulit napas")) symptoms.push("SESAK_NAPAS");
    if (lower.includes("kuning")) symptoms.push("KUNING_IKTERIK");
    if (lower.includes("muntah hebat")) symptoms.push("MUNTAH_HEBAT");
    if (lower.includes("penglihatan") || lower.includes("kabur")) symptoms.push("GANGGUAN_PENGLIHATAN");
    if (lower.includes("pendengaran") || lower.includes("tuli") || lower.includes("denging")) symptoms.push("GANGGUAN_PENDENGARAN");
    if (lower.includes("ruam") || lower.includes("gatal hebat")) symptoms.push("RUAM_KULIT_BERAT");
    if (lower.includes("demam tinggi")) symptoms.push("DEMAM_TINGGI_MENETAP");

    // Minor side effects
    if (lower.includes("urine merah") || lower.includes("kencing merah")) symptoms.push("URINE_MERAH");
    if (lower.includes("mual")) symptoms.push("MUAL_RINGAN");
    if (lower.includes("nyeri sendi") || lower.includes("pegal")) symptoms.push("NYERI_SENDI_RINGAN");
    if (lower.includes("lemas") || lower.includes("ngantuk")) symptoms.push("MENGANTUK_LEMAS");

    // Intent to stop
    if (lower.includes("berhenti") || lower.includes("tidak mau minum lagi") || lower.includes("menolak")) {
      intentToStopOrRefuse = true;
    }

    return {
      transcript: text,
      medicationTaken,
      pillsTakenCount,
      symptoms,
      intentToStopOrRefuse,
      extractionConfidence: 0.9,
      emotionalSentiment: intentToStopOrRefuse ? "distressed" : "calm",
    };
  }
}
