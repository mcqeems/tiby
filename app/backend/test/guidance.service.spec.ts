import { describe, it, expect, vi } from "vitest";
import { ServiceUnavailableException } from "@nestjs/common";
import { GuidanceService } from "../src/modules/guidance/services/guidance.service.js";

describe("GuidanceService Unit Tests", () => {
  const aiClient = { askGuidance: vi.fn() };
  const service = new GuidanceService(aiClient as any);

  it("forwards the question and transcript unchanged", async () => {
    aiClient.askGuidance.mockResolvedValue({
      answer: "Ya.",
      grounded: true,
      evidence: [],
      citations: [],
      limitations: [],
    });

    await service.ask({ question: "Apakah mual itu wajar?", transcript: "Saya mual." });

    expect(aiClient.askGuidance).toHaveBeenCalledWith(
      "Apakah mual itu wajar?",
      "Saya mual.",
    );
  });

  it("passes a fail-closed answer through instead of raising", async () => {
    aiClient.askGuidance.mockResolvedValue({
      answer: null,
      grounded: false,
      evidence: [],
      citations: [],
      limitations: ["Silakan hubungi tenaga kesehatan."],
    });

    const res = await service.ask({ question: "Berapa dosis saya?" });

    expect(res.answer).toBeNull();
  });

  it("propagates an unavailable provider rather than inventing an answer", async () => {
    aiClient.askGuidance.mockRejectedValue(
      new ServiceUnavailableException({ code: "INTERNAL", message: "down" }),
    );

    await expect(service.ask({ question: "Apakah mual itu wajar?" })).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
