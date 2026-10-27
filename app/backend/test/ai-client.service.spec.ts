import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { ServiceUnavailableException } from "@nestjs/common";
import { AiClientService } from "../src/modules/internal/ai-client/ai-client.service.js";

describe("AiClientService Unit Tests", () => {
  const service = new AiClientService();

  // Run offline: a live AI provider must never make these deterministic
  // cases flaky or push them past the test timeout.
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  });
  afterEach(() => vi.unstubAllGlobals());

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
  describe("audio transcript projection", () => {
    it("drops every field except the transcript", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            transcript: "Saya sudah minum 4 butir obat.",
            medicationTaken: "SUDAH_MINUM",
            pillsTakenCount: 4,
            symptoms: [],
            intentToStopOrRefuse: false,
            extractionConfidence: 0.9,
          }),
        }),
      );

      const res = await service.transcribeFromAudio(
        Buffer.from("dummy-audio-bytes"),
        "checkin.webm",
        "audio/webm",
      );

      expect(res).toEqual({ transcript: "Saya sudah minum 4 butir obat." });
    });
  });

  describe("askGuidance", () => {
    it("posts the question and transcript to the documented route", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          answer: "Mual ringan termasuk efek samping umum.",
          grounded: true,
          evidence: [{ citation_id: "src-1", text: "Mual ringan..." }],
          citations: [
            {
              citation_id: "src-1",
              document_id: "kemenkes-juknis-tb-so-2025",
              organization: "Kemenkes",
              title: "Juknis TB SO",
              year: 2025,
              page: 116,
              section: null,
              source_url: "https://example.test/juknis.pdf",
            },
          ],
          limitations: [],
        }),
      });
      vi.stubGlobal("fetch", fetchMock);

      const res = await service.askGuidance("Apakah mual itu wajar?", "Saya mual.");

      expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/ai\/guidance$/);
      expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
        question: "Apakah mual itu wajar?",
        transcript: "Saya mual.",
      });
      expect(res.grounded).toBe(true);
      expect(res.citations[0].citation_id).toBe("src-1");
    });

    it("passes a fail-closed null answer through", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            answer: null,
            grounded: false,
            evidence: [],
            citations: [],
            limitations: ["Silakan hubungi tenaga kesehatan."],
          }),
        }),
      );

      const res = await service.askGuidance("Berapa dosis saya?");

      expect(res.answer).toBeNull();
      expect(res.limitations).toHaveLength(1);
    });

    it("throws 503 when the provider fails", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));

      await expect(service.askGuidance("Apakah mual itu wajar?")).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it("throws 503 when the response drifts from the contract", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ answer: "Tambah dosis jadi 8 butir." }),
        }),
      );

      await expect(service.askGuidance("Berapa dosis saya?")).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });
});
