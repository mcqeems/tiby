import { describe, it, expect } from "vitest";
import { RuleEngineService } from "../src/modules/internal/rule-engine/rule-engine.service.js";

describe("RuleEngineService", () => {
  const service = new RuleEngineService();

  it("evaluates Scenario A (TERKENDALI): full dose fulfilled, no symptoms", () => {
    const res = service.evaluate({
      medicationStatus: "SUDAH_MINUM",
      pillsTakenCount: 4,
      dailyPillQuota: 4,
      symptoms: [],
      intentToStopOrRefuse: false,
      extractionConfidence: 0.95,
    });

    expect(res.verdict).toBe("TERKENDALI");
    expect(res.isDoseFulfilled).toBe(true);
    expect(res.redoRequiredToday).toBe(false);
    expect(res.failSafeTriggered).toBe(false);
    expect(res.matchedRuleCodes).toContain("RULE_DOSE_FULFILLED_NO_SYMPTOMS");
  });

  it("evaluates Scenario B (PERLU_PERHATIAN): full dose with minor side effect", () => {
    const res = service.evaluate({
      medicationStatus: "SUDAH_MINUM",
      pillsTakenCount: 4,
      dailyPillQuota: 4,
      symptoms: ["URINE_MERAH", "MUAL_RINGAN"],
      intentToStopOrRefuse: false,
      extractionConfidence: 0.9,
    });

    expect(res.verdict).toBe("PERLU_PERHATIAN");
    expect(res.isDoseFulfilled).toBe(true);
    expect(res.redoRequiredToday).toBe(false);
    expect(res.matchedRuleCodes).toContain("RULE_DOSE_FULFILLED_MINOR_SIDE_EFFECTS");
  });

  it("evaluates Scenario C (PERLU_PERHATIAN): missed dose (BELUM_MINUM)", () => {
    const res = service.evaluate({
      medicationStatus: "BELUM_MINUM",
      pillsTakenCount: 0,
      dailyPillQuota: 4,
      symptoms: [],
      intentToStopOrRefuse: false,
      extractionConfidence: 0.9,
    });

    expect(res.verdict).toBe("PERLU_PERHATIAN");
    expect(res.isDoseFulfilled).toBe(false);
    expect(res.redoRequiredToday).toBe(true);
    expect(res.matchedRuleCodes).toContain("RULE_INCOMPLETE_DOSE_RETRY_REQUIRED");
  });

  it("evaluates Scenario C (PERLU_PERHATIAN): partial dose taken", () => {
    const res = service.evaluate({
      medicationStatus: "SUDAH_MINUM",
      pillsTakenCount: 2,
      dailyPillQuota: 4,
      symptoms: [],
      intentToStopOrRefuse: false,
      extractionConfidence: 0.9,
    });

    expect(res.verdict).toBe("PERLU_PERHATIAN");
    expect(res.isDoseFulfilled).toBe(false);
    expect(res.redoRequiredToday).toBe(true);
    expect(res.matchedRuleCodes).toContain("RULE_INCOMPLETE_DOSE_RETRY_REQUIRED");
  });

  it("evaluates Fail-Safe (PERLU_PERHATIAN): low confidence < 0.75", () => {
    const res = service.evaluate({
      medicationStatus: "SUDAH_MINUM",
      pillsTakenCount: 4,
      dailyPillQuota: 4,
      symptoms: [],
      intentToStopOrRefuse: false,
      extractionConfidence: 0.6,
    });

    expect(res.verdict).toBe("PERLU_PERHATIAN");
    expect(res.isDoseFulfilled).toBe(false);
    expect(res.redoRequiredToday).toBe(true);
    expect(res.failSafeTriggered).toBe(true);
    expect(res.matchedRuleCodes).toContain("RULE_FAIL_SAFE_LOW_CONFIDENCE");
  });

  it("evaluates Fail-Safe (PERLU_PERHATIAN): ambiguous TIDAK_PASTI", () => {
    const res = service.evaluate({
      medicationStatus: "TIDAK_PASTI",
      pillsTakenCount: null,
      dailyPillQuota: 4,
      symptoms: [],
      intentToStopOrRefuse: false,
      extractionConfidence: 0.85,
    });

    expect(res.verdict).toBe("PERLU_PERHATIAN");
    expect(res.isDoseFulfilled).toBe(false);
    expect(res.redoRequiredToday).toBe(true);
    expect(res.failSafeTriggered).toBe(true);
  });

  it("evaluates Scenario D (SEGERA_KE_FASKES): major clinical red flag", () => {
    const res = service.evaluate({
      medicationStatus: "SUDAH_MINUM",
      pillsTakenCount: 4,
      dailyPillQuota: 4,
      symptoms: ["BATUK_DARAH"],
      intentToStopOrRefuse: false,
      extractionConfidence: 0.9,
    });

    expect(res.verdict).toBe("SEGERA_KE_FASKES");
    expect(res.isDoseFulfilled).toBe(true);
    expect(res.matchedRuleCodes).toContain("RULE_CRITICAL_RED_FLAG");
  });

  it("evaluates Scenario D (SEGERA_KE_FASKES): intent to stop treatment", () => {
    const res = service.evaluate({
      medicationStatus: "BELUM_MINUM",
      pillsTakenCount: 0,
      dailyPillQuota: 4,
      symptoms: [],
      intentToStopOrRefuse: true,
      extractionConfidence: 0.9,
    });

    expect(res.verdict).toBe("SEGERA_KE_FASKES");
    expect(res.isDoseFulfilled).toBe(false);
    expect(res.redoRequiredToday).toBe(true);
    expect(res.matchedRuleCodes).toContain("RULE_INTENT_TO_STOP");
  });
});
