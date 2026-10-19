import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { CheckInService } from "../src/modules/check-ins/services/check-in.service.js";

describe("CheckInService Unit Tests", () => {
  let service: CheckInService;

  let mockCheckInRepo: any;
  let mockEvalRepo: any;
  let mockPlanRepo: any;
  let mockPmoRepo: any;
  let mockTicketRepo: any;
  let mockAlertRepo: any;
  let mockHistoryRepo: any;
  let mockAuditRepo: any;
  let mockAiClient: any;
  let mockRuleEngine: any;
  let mockEventEmitter: any;

  beforeEach(() => {
    mockCheckInRepo = {
      findOne: vi.fn(),
      countBy: vi.fn().mockResolvedValue(0),
      create: vi.fn((data) => ({ id: "checkin-1", ...data, submittedAt: new Date() })),
      save: vi.fn((data) => Promise.resolve({ id: "checkin-1", ...data, submittedAt: new Date() })),
    };
    mockEvalRepo = {
      findOneBy: vi.fn(),
      create: vi.fn((data) => data),
      save: vi.fn((data) => Promise.resolve(data)),
    };
    mockPlanRepo = {
      findOne: vi.fn(),
      findOneBy: vi.fn(),
      save: vi.fn((data) => Promise.resolve(data)),
    };
    mockPmoRepo = {
      findOne: vi.fn(),
      find: vi.fn(),
    };
    mockTicketRepo = {
      find: vi.fn().mockResolvedValue([]),
      create: vi.fn((data) => ({ id: "ticket-1", ...data })),
      save: vi.fn((data) => Promise.resolve({ id: "ticket-1", ...data })),
    };
    mockAlertRepo = {
      create: vi.fn((data) => data),
      save: vi.fn((data) => Promise.resolve(data)),
    };
    mockHistoryRepo = {
      create: vi.fn((data) => data),
      save: vi.fn((data) => Promise.resolve(data)),
    };
    mockAuditRepo = {
      create: vi.fn((data) => data),
      save: vi.fn((data) => Promise.resolve(data)),
    };
    mockAiClient = {
      extractFromAudio: vi.fn(),
      extractFromText: vi.fn(),
    };
    mockRuleEngine = {
      evaluate: vi.fn(),
    };
    mockEventEmitter = {
      emit: vi.fn(),
    };

    service = new CheckInService(
      mockCheckInRepo,
      mockEvalRepo,
      mockPlanRepo,
      mockPmoRepo,
      mockTicketRepo,
      mockAlertRepo,
      mockHistoryRepo,
      mockAuditRepo,
      mockAiClient,
      mockRuleEngine,
      mockEventEmitter,
    );
  });

  describe("resolvePlan & checkIsLockedToday", () => {
    it("throws NotFoundException if patient has no active treatment plan", async () => {
      mockPlanRepo.findOne.mockResolvedValue(null);

      await expect(service.resolvePlan("user-1", "PASIEN")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("throws BadRequestException if PMO submits without treatmentPlanId", async () => {
      await expect(service.resolvePlan("pmo-1", "PMO")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("throws BadRequestException if PMO is not assigned to plan", async () => {
      mockPmoRepo.findOne.mockResolvedValue(null);

      await expect(
        service.resolvePlan("pmo-1", "PMO", "plan-1"),
      ).rejects.toThrow(BadRequestException);
    });

    it("throws ConflictException (CHECK_IN_ALREADY_LOCKED) if dose fulfilled today", async () => {
      mockCheckInRepo.findOne.mockResolvedValue({ id: "checkin-locked", isDoseFulfilled: true });

      await expect(
        service.checkIsLockedToday("plan-1", "2026-10-16"),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("submitCheckIn - Incomplete Dose (Scenario C)", () => {
    it("saves check-in with isDoseFulfilled=false, emits DOSE_INCOMPLETE_NUDGE, does NOT lock day", async () => {
      const plan = {
        id: "plan-1",
        patientUserId: "user-1",
        facilityId: "faskes-1",
        dailyPillQuota: 4,
        currentStreak: 2,
        consecutiveSilenceDays: 0,
        patientState: "AKTIF",
      };
      mockPlanRepo.findOne.mockResolvedValue(plan);
      mockCheckInRepo.findOne.mockResolvedValue(null); // unlocked

      mockRuleEngine.evaluate.mockReturnValue({
        verdict: "PERLU_PERHATIAN",
        isDoseFulfilled: false,
        redoRequiredToday: true,
        matchedRuleCodes: ["RULE_INCOMPLETE_DOSE_RETRY_REQUIRED"],
        failSafeTriggered: false,
        failSafeReason: null,
        responseMessage: "Silakan minum sisa obat hari ini.",
      });

      const res = await service.submitCheckIn("user-1", "PASIEN", {
        inputMode: "FALLBACK_BUTTONS",
        fallbackButtons: {
          medicationStatus: "BELUM_MINUM",
          pillsTakenCount: 0,
          selectedComplaints: [],
        },
      });

      expect(res.verdict).toBe("PERLU_PERHATIAN");
      expect(res.isDoseFulfilled).toBe(false);
      expect(res.redoRequiredToday).toBe(true);

      // Verify streak was NOT incremented
      expect(mockPlanRepo.save).not.toHaveBeenCalled();

      // Verify notification event emitted for incomplete dose
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        "notification.trigger",
        expect.objectContaining({
          circumstance: "DOSE_INCOMPLETE_NUDGE",
          treatmentPlanId: "plan-1",
          recipientRole: "PASIEN",
        }),
      );

      // Verify DOSE_RETRY_WARNING alert emitted
      expect(mockAlertRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          facilityId: "faskes-1",
          treatmentPlanId: "plan-1",
          alertType: "DOSE_RETRY_WARNING",
          severity: "INFO",
        }),
      );
    });
  });

  describe("submitCheckIn - Full Dose & Streak Increment (Scenario A)", () => {
    it("locks check-in, increments streak, saves evaluation", async () => {
      const plan = {
        id: "plan-1",
        patientUserId: "user-1",
        facilityId: "faskes-1",
        dailyPillQuota: 4,
        currentStreak: 2,
        consecutiveSilenceDays: 0,
        patientState: "AKTIF",
      };
      mockPlanRepo.findOne.mockResolvedValue(plan);
      mockCheckInRepo.findOne.mockResolvedValue(null);

      mockRuleEngine.evaluate.mockReturnValue({
        verdict: "TERKENDALI",
        isDoseFulfilled: true,
        redoRequiredToday: false,
        matchedRuleCodes: ["RULE_DOSE_FULFILLED_NO_SYMPTOMS"],
        failSafeTriggered: false,
        failSafeReason: null,
        responseMessage: "Luar biasa! Obat lengkap.",
      });

      const res = await service.submitCheckIn("user-1", "PASIEN", {
        inputMode: "VOICE_STT",
        confirmedFacts: {
          transcript: "Sudah minum 4 pil.",
          medicationStatus: "SUDAH_MINUM",
          pillsTakenCount: 4,
          symptoms: [],
          intentToStop: false,
          confidence: 0.95,
        },
      });

      expect(res.verdict).toBe("TERKENDALI");
      expect(res.isDoseFulfilled).toBe(true);
      expect(res.redoRequiredToday).toBe(false);
      expect(plan.currentStreak).toBe(3); // 2 + 1
      expect(mockPlanRepo.save).toHaveBeenCalledWith(plan);
    });
  });

  describe("submitCheckIn - Silence Recovery (DEC-05)", () => {
    it("resets streak to 1, sets consecutiveSilenceDays to 0, auto-closes SILENCE_H3 tickets", async () => {
      const plan = {
        id: "plan-1",
        patientUserId: "user-1",
        facilityId: "faskes-1",
        dailyPillQuota: 4,
        currentStreak: 0,
        consecutiveSilenceDays: 3,
        patientState: "BERISIKO",
      };
      mockPlanRepo.findOne.mockResolvedValue(plan);
      mockCheckInRepo.findOne.mockResolvedValue(null);

      const silenceTicket = {
        id: "ticket-silence-1",
        treatmentPlanId: "plan-1",
        triggerSource: "SILENCE_H3",
        status: "OPEN",
      };
      mockTicketRepo.find.mockResolvedValue([silenceTicket]);

      mockRuleEngine.evaluate.mockReturnValue({
        verdict: "TERKENDALI",
        isDoseFulfilled: true,
        redoRequiredToday: false,
        matchedRuleCodes: ["RULE_DOSE_FULFILLED_NO_SYMPTOMS"],
        failSafeTriggered: false,
        failSafeReason: null,
        responseMessage: "Selamat datang kembali!",
      });

      const res = await service.submitCheckIn("user-1", "PASIEN", {
        inputMode: "VOICE_STT",
        confirmedFacts: {
          transcript: "Saya sudah minum 4 obat hari ini.",
          medicationStatus: "SUDAH_MINUM",
          pillsTakenCount: 4,
          symptoms: [],
          intentToStop: false,
          confidence: 0.95,
        },
      });

      // DEC-05: Recovered patient has streak reset to 1
      expect(plan.currentStreak).toBe(1);
      expect(plan.consecutiveSilenceDays).toBe(0);
      expect(plan.patientState).toBe("AKTIF");
      expect(mockPlanRepo.save).toHaveBeenCalledWith(plan);

      // Auto-closed silence ticket
      expect(silenceTicket.status).toBe("AUTO_CLOSED_BY_CHECKIN");
      expect(mockTicketRepo.save).toHaveBeenCalledWith(silenceTicket);

      // Warning alert generated for facility
      expect(mockAlertRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          facilityId: "faskes-1",
          alertType: "SILENCE_RECOVERED_WARNING",
          severity: "WARNING",
        }),
      );
      expect(res.currentStreak).toBe(1);
    });
  });

  describe("submitCheckIn - Critical Red Flag (Scenario D)", () => {
    it("transitions plan to BERISIKO, increases riskScore, creates CRITICAL InterventionTicket, emits alert event", async () => {
      const plan = {
        id: "plan-1",
        patientUserId: "user-1",
        facilityId: "faskes-1",
        dailyPillQuota: 4,
        currentStreak: 4,
        consecutiveSilenceDays: 0,
        patientState: "AKTIF",
        riskScore: 10,
      };
      mockPlanRepo.findOne.mockResolvedValue(plan);
      mockCheckInRepo.findOne.mockResolvedValue(null);

      mockRuleEngine.evaluate.mockReturnValue({
        verdict: "SEGERA_KE_FASKES",
        isDoseFulfilled: true,
        redoRequiredToday: false,
        matchedRuleCodes: ["RULE_CRITICAL_RED_FLAG"],
        failSafeTriggered: false,
        failSafeReason: null,
        responseMessage: "Harap segera ke fasilitas kesehatan.",
      });

      const res = await service.submitCheckIn("user-1", "PASIEN", {
        inputMode: "VOICE_STT",
        confirmedFacts: {
          transcript: "Batuk darah banyak.",
          medicationStatus: "SUDAH_MINUM",
          pillsTakenCount: 4,
          symptoms: ["BATUK_DARAH"],
          intentToStop: false,
          confidence: 0.95,
        },
      });

      expect(res.verdict).toBe("SEGERA_KE_FASKES");
      expect(plan.patientState).toBe("BERISIKO");
      expect(plan.riskScore).toBe(35); // 10 + 25

      // Verify CRITICAL ticket created
      expect(mockTicketRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          treatmentPlanId: "plan-1",
          facilityId: "faskes-1",
          triggerSource: "RED_FLAG",
          priority: "CRITICAL",
          status: "OPEN",
        }),
      );

      // Verify notification event emitted for PMO
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        "notification.trigger",
        expect.objectContaining({
          circumstance: "RED_FLAG_ALERT",
          treatmentPlanId: "plan-1",
          recipientRole: "PMO",
        }),
      );
    });
  });

  describe("createPmoFollowUp", () => {
    it("logs PMO outreach notes and adds additional family contact if provided", async () => {
      mockPlanRepo.findOne.mockResolvedValue({
        id: "plan-1",
        patientUserId: "patient-1",
        patientState: "AKTIF",
        currentStreak: 5,
      });

      mockPmoRepo.findOne.mockResolvedValue({
        id: "pmo-assign-1",
        treatmentPlanId: "plan-1",
        pmoUserId: "pmo-1",
        active: true,
      });

      const res = await service.createPmoFollowUp("pmo-1", "patient-1", {
        actionTaken: "KUNJUNGAN_RUMAH",
        notes: "Pasien minum obat dengan baik",
      });

      expect(res.success).toBe(true);
      expect(res.notes).toBe("Pasien minum obat dengan baik");
      expect(mockHistoryRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          treatmentPlanId: "plan-1",
          eventType: "PMO_OUTREACH",
          actorUserId: "pmo-1",
          actorRole: "PMO",
          reasonOrSummary: "Pasien minum obat dengan baik",
        }),
      );
    });
  });
});
