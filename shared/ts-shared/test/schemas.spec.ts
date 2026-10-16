import { describe, expect, it } from "vitest";
import {
  PushSubscriptionPayloadSchema,
  WhatsappConnectChallengeSchema,
  AiAudioExtractionResponseSchema,
  SubmitCheckInSchema,
  CheckInVerdictResponseSchema,
  GrantConsentSchema,
  CreateOnboardingSchema,
  SafetyVerdicts,
  UserRoles,
} from "../src/index.js";

describe("@tiby/ts-shared contracts", () => {
  it("validates PushSubscriptionPayloadSchema", () => {
    const valid = {
      endpoint: "https://fcm.googleapis.com/fcm/send/sample-token",
      expirationTime: null,
      keys: {
        p256dh: "key-p256dh-sample",
        auth: "key-auth-sample",
      },
    };
    const parsed = PushSubscriptionPayloadSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it("validates WhatsappConnectChallengeSchema", () => {
    const valid = {
      verificationCode: "K9X4T2",
      botPhoneNumber: "628123456789",
      wahaDeepLink: "https://wa.me/628123456789?text=K9X4T2",
      expiresAt: new Date().toISOString(),
    };
    const parsed = WhatsappConnectChallengeSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it("validates AiAudioExtractionResponseSchema", () => {
    const valid = {
      transcript: "Saya sudah minum 3 obat pagi ini",
      medicationTaken: "SUDAH_MINUM",
      pillsTakenCount: 3,
      symptoms: ["URINE_MERAH"],
      intentToStopOrRefuse: false,
      extractionConfidence: 0.95,
      emotionalSentiment: "calm",
    };
    const parsed = AiAudioExtractionResponseSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it("has expected enum values", () => {
    expect(UserRoles).toContain("PASIEN");
    expect(UserRoles).toContain("PMO");
    expect(UserRoles).toContain("NAKES");
    expect(SafetyVerdicts).toEqual(["TERKENDALI", "PERLU_PERHATIAN", "SEGERA_KE_FASKES"]);
  });
});
