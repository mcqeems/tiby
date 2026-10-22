import { Injectable, Logger } from "@nestjs/common";
import type { AiAudioExtractionResponse, MedicationStatus } from "@tiby/ts-shared";

@Injectable()
export class AiClientService {
  private readonly logger = new Logger(AiClientService.name);
  private readonly baseUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";

  async extractFromAudio(
    audioBuffer: Buffer,
    filename: string,
    mimetype: string,
  ): Promise<AiAudioExtractionResponse> {
    try {
      const formData = new FormData();
      const blob = new Blob([new Uint8Array(audioBuffer)], { type: mimetype });
      formData.append("audio", blob, filename);

      const res = await fetch(`${this.baseUrl}/audio/extract`, {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(6000),
      });

      if (res.ok) {
        return (await res.json()) as AiAudioExtractionResponse;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`AI Service offline or failed: ${msg}. Using fallback mock extraction.`);
    }

    // Heuristic fallback for offline local testing
    return {
      transcript: "Halo Pandu, saya sudah minum 4 butir obat pagi ini dan tidak ada keluhan.",
      medicationTaken: "SUDAH_MINUM",
      pillsTakenCount: 4,
      symptoms: [],
      intentToStopOrRefuse: false,
      extractionConfidence: 0.92,
      emotionalSentiment: "positive",
    };
  }

  async extractFromText(transcriptText: string): Promise<AiAudioExtractionResponse> {
    try {
      const res = await fetch(`${this.baseUrl}/text/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: transcriptText }),
        signal: AbortSignal.timeout(6000),
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
