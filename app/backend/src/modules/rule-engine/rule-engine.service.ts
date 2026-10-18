import { Injectable } from "@nestjs/common";
import {
  MajorRedFlags,
  MinorSideEffects,
  type MedicationStatus,
  type SafetyVerdict,
  type MajorRedFlag,
  type MinorSideEffect,
} from "@tiby/ts-shared";

export interface RuleEvaluationInput {
  medicationStatus: MedicationStatus;
  pillsTakenCount: number | null;
  dailyPillQuota: number;
  symptoms: string[];
  intentToStopOrRefuse: boolean;
  extractionConfidence: number;
}

export interface RuleEvaluationResult {
  verdict: SafetyVerdict;
  isDoseFulfilled: boolean;
  redoRequiredToday: boolean;
  matchedRuleCodes: string[];
  failSafeTriggered: boolean;
  failSafeReason: string | null;
  responseMessage: string;
}

@Injectable()
export class RuleEngineService {
  evaluate(input: RuleEvaluationInput): RuleEvaluationResult {
    const matchedRuleCodes: string[] = [];
    const activeMajorFlags = input.symptoms.filter((s) =>
      MajorRedFlags.includes(s as MajorRedFlag),
    );
    const activeMinorEffects = input.symptoms.filter((s) =>
      MinorSideEffects.includes(s as MinorSideEffect),
    );

    // 1. Scenario D: Critical Red Flags or Intent to Stop
    if (activeMajorFlags.length > 0 || input.intentToStopOrRefuse) {
      if (activeMajorFlags.length > 0) {
        matchedRuleCodes.push("RULE_CRITICAL_RED_FLAG");
      }
      if (input.intentToStopOrRefuse) {
        matchedRuleCodes.push("RULE_INTENT_TO_STOP");
      }

      const isDoseFulfilled =
        input.medicationStatus === "SUDAH_MINUM" &&
        input.pillsTakenCount !== null &&
        input.pillsTakenCount >= input.dailyPillQuota;

      return {
        verdict: "SEGERA_KE_FASKES",
        isDoseFulfilled,
        redoRequiredToday: !isDoseFulfilled,
        matchedRuleCodes,
        failSafeTriggered: false,
        failSafeReason: null,
        responseMessage:
          "Pandu mencatat gejala yang memerlukan perhatian medis. Jangan cemas, tim faskes Anda sudah diberitahu dan silakan hubungi faskes terdekat.",
      };
    }

    // 2. Fail-Safe: Low confidence or ambiguous status
    if (input.extractionConfidence < 0.75 || input.medicationStatus === "TIDAK_PASTI") {
      matchedRuleCodes.push("RULE_FAIL_SAFE_LOW_CONFIDENCE");
      return {
        verdict: "PERLU_PERHATIAN",
        isDoseFulfilled: false,
        redoRequiredToday: true,
        matchedRuleCodes,
        failSafeTriggered: true,
        failSafeReason:
          input.extractionConfidence < 0.75
            ? "Confidence di bawah batas aman (0.75)"
            : "Status minum obat tidak pasti",
        responseMessage:
          "Pandu kurang jelas mendengar laporanmu. Silakan ulangi check-in atau gunakan tombol konfirmasi ya.",
      };
    }

    // 3. Scenario C: Incomplete or Missed Dose
    const isMissed = input.medicationStatus === "BELUM_MINUM";
    const isPartial =
      input.pillsTakenCount !== null && input.pillsTakenCount < input.dailyPillQuota;

    if (isMissed || isPartial) {
      matchedRuleCodes.push("RULE_INCOMPLETE_DOSE_RETRY_REQUIRED");
      return {
        verdict: "PERLU_PERHATIAN",
        isDoseFulfilled: false,
        redoRequiredToday: true,
        matchedRuleCodes,
        failSafeTriggered: false,
        failSafeReason: null,
        responseMessage: isMissed
          ? "Pandu mengingatkan untuk segera minum obat hari ini ya. Lakukan check-in lagi setelah obat diminum sebelum tengah malam."
          : `Kamu baru meminum ${input.pillsTakenCount} dari ${input.dailyPillQuota} butir obat. Silakan minum sisanya dan laporkan kembali hari ini.`,
      };
    }

    // 4. Scenario B: Valid Dose with Minor Side Effects
    if (activeMinorEffects.length > 0) {
      matchedRuleCodes.push("RULE_DOSE_FULFILLED_MINOR_SIDE_EFFECTS");
      return {
        verdict: "PERLU_PERHATIAN",
        isDoseFulfilled: true,
        redoRequiredToday: false,
        matchedRuleCodes,
        failSafeTriggered: false,
        failSafeReason: null,
        responseMessage:
          "Obat hari ini tercatat lengkap! Gejala ringan seperti air kencing kemerahan atau sedikit mual adalah wajar. Tetap semangat!",
      };
    }

    // 5. Scenario A: Valid Dose & Zero Complaints
    matchedRuleCodes.push("RULE_DOSE_FULFILLED_NO_SYMPTOMS");
    return {
      verdict: "TERKENDALI",
      isDoseFulfilled: true,
      redoRequiredToday: false,
      matchedRuleCodes,
      failSafeTriggered: false,
      failSafeReason: null,
      responseMessage:
        "Luar biasa! Obat hari ini sudah diminum dengan lengkap dan tanpa keluhan. Terus pertahankan semangatmu bersama Pandu!",
    };
  }
}
