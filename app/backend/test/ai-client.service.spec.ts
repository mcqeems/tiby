import { describe, it, expect } from "vitest";
import { AiClientService } from "../src/modules/internal/ai-client/ai-client.service.js";

describe("AiClientService Unit Tests", () => {
  const service = new AiClientService();

  describe("fallbackHeuristicExtraction", () => {
    it("detects SUDAH_MINUM and pill count from transcript", async () => {
      const res = await service.extractFromText("Halo, saya sudah minum 4 butir obat pagi ini.");
      expect(res.medicationTaken).toBe("SUDAH_MINUM");
      expect(res.pillsTakenCount).toBe(4);
      expect(res.symptoms).toEqual([]);
      expect(res.intentToStopOrRefuse).toBe(false);
    });

    it("detects BELUM_MINUM when transcript mentions belum or lupa", async () => {
      const res = await service.extractFromText("Saya belum minum obat karena masih di jalan.");
      expect(res.medicationTaken).toBe("BELUM_MINUM");
      expect(res.pillsTakenCount).toBe(0);
    });

    it("detects TIDAK_PASTI when transcript expresses doubt", async () => {
      const res = await service.extractFromText("Saya agak ragu apakah tadi sudah minum atau belum.");
      expect(res.medicationTaken).toBe("TIDAK_PASTI");
      expect(res.pillsTakenCount).toBeNull();
    });

    it("detects major red flags: BATUK_DARAH and SESAK_NAPAS", async () => {
      const res = await service.extractFromText("Saya sudah minum 4 obat tapi batuk darah dan sesak.");
      expect(res.symptoms).toContain("BATUK_DARAH");
      expect(res.symptoms).toContain("SESAK_NAPAS");
    });

    it("detects other red flags: KUNING_IKTERIK, MUNTAH_HEBAT, GANGGUAN_PENGLIHATAN", async () => {
      const res = await service.extractFromText("Kulit kuning, muntah hebat, dan penglihatan kabur.");
      expect(res.symptoms).toContain("KUNING_IKTERIK");
      expect(res.symptoms).toContain("MUNTAH_HEBAT");
      expect(res.symptoms).toContain("GANGGUAN_PENGLIHATAN");
    });

    it("detects minor side effects: URINE_MERAH and MUAL_RINGAN", async () => {
      const res = await service.extractFromText("Sudah minum 4 pil, kencing merah dan sedikit mual.");
      expect(res.symptoms).toContain("URINE_MERAH");
      expect(res.symptoms).toContain("MUAL_RINGAN");
    });

    it("detects intentToStopOrRefuse when patient states intention to stop", async () => {
      const res = await service.extractFromText("Saya ingin berhenti dan tidak mau minum lagi obat ini.");
      expect(res.intentToStopOrRefuse).toBe(true);
      expect(res.emotionalSentiment).toBe("distressed");
    });

    it("returns the fallback transcript when AI service is offline", async () => {
      const audioBuffer = Buffer.from("dummy-audio-bytes");
      const res = await service.transcribeFromAudio(
        audioBuffer,
        "checkin.webm",
        "audio/webm",
      );
      expect(res.transcript).toContain("sudah minum");
      // Transcript-only: the bridge must not invent facts before the patient
      // has confirmed the text.
      expect(Object.keys(res)).toEqual(["transcript"]);
    });
  });
});
