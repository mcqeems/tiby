import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
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
      findAndCount: vi.fn(),
      countBy: vi.fn().mockResolvedValue(0),
      create: vi.fn((data) => ({ id: "checkin-1", ...data, submittedAt: new Date() })),
      save: vi.fn((data) => Promise.resolve({ id: "checkin-1", ...data, submittedAt: new Date() })),
    };
    mockEvalRepo = {
      findOneBy: vi.fn(),
      find: vi.fn().mockResolvedValue([]),
      create: vi.fn((data) => data),
      save: vi.fn((data) => Promise.resolve(data)),
    };
    mockPlanRepo = {
      findOne: vi.fn(),
      findOneBy: vi.fn(),
      find: vi.fn().mockResolvedValue([]),
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
      transcribeFromAudio: vi.fn(),
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
          hasComplaints: false,
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
      // Client-supplied facts win: the AI service is not asked again.
      expect(mockAiClient.extractFromText).not.toHaveBeenCalled();
    });

    it("starts a new streak at 1 when the previous dose is older than yesterday", async () => {
      const today = new Date().toISOString().slice(0, 10);
      const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000)
        .toISOString()
        .slice(0, 10);
      const plan = {
        id: "plan-1",
        patientUserId: "user-1",
        facilityId: "faskes-1",
        dailyPillQuota: 4,
        currentStreak: 4,
        consecutiveSilenceDays: 0,
        patientState: "AKTIF",
      };
      mockPlanRepo.findOne.mockResolvedValue(plan);
      mockCheckInRepo.findOne
        .mockResolvedValueOnce(null) // not locked yet
        .mockResolvedValueOnce({ id: "old-checkin", checkInDate: threeDaysAgo });
      mockRuleEngine.evaluate.mockReturnValue({
        verdict: "TERKENDALI",
        isDoseFulfilled: true,
        redoRequiredToday: false,
        matchedRuleCodes: ["RULE_DOSE_FULFILLED_NO_SYMPTOMS"],
        failSafeTriggered: false,
        failSafeReason: null,
        responseMessage: "Luar biasa! Obat lengkap.",
      });

      await service.submitCheckIn("user-1", "PASIEN", {
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

      expect(today).toBeDefined();
      expect(plan.currentStreak).toBe(1); // gap -> new streak
    });

    it("increments normally when yesterday's dose was reported", async () => {
      const yesterday = new Date(Date.now() - 86_400_000)
        .toISOString()
        .slice(0, 10);
      const plan = {
        id: "plan-1",
        patientUserId: "user-1",
        facilityId: "faskes-1",
        dailyPillQuota: 4,
        currentStreak: 4,
        consecutiveSilenceDays: 0,
        patientState: "AKTIF",
      };
      mockPlanRepo.findOne.mockResolvedValue(plan);
      mockCheckInRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: "yesterday-checkin", checkInDate: yesterday });
      mockRuleEngine.evaluate.mockReturnValue({
        verdict: "TERKENDALI",
        isDoseFulfilled: true,
        redoRequiredToday: false,
        matchedRuleCodes: ["RULE_DOSE_FULFILLED_NO_SYMPTOMS"],
        failSafeTriggered: false,
        failSafeReason: null,
        responseMessage: "Luar biasa! Obat lengkap.",
      });

      await service.submitCheckIn("user-1", "PASIEN", {
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

      expect(plan.currentStreak).toBe(5); // 4 + 1
    });

    it("extracts facts from the confirmed transcript when the client sends none", async () => {
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
      mockAiClient.extractFromText.mockResolvedValue({
        transcript: "Sudah minum 4 pil.",
        medicationTaken: "SUDAH_MINUM",
        pillsTakenCount: 4,
        symptoms: [],
        intentToStopOrRefuse: false,
        extractionConfidence: 0.93,
      });

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
        confirmedFacts: { transcript: "Sudah minum 4 pil." },
      });

      expect(mockAiClient.extractFromText).toHaveBeenCalledWith("Sudah minum 4 pil.");
      expect(mockRuleEngine.evaluate).toHaveBeenCalledWith(
        expect.objectContaining({
          medicationStatus: "SUDAH_MINUM",
          pillsTakenCount: 4,
          extractionConfidence: 0.93,
        }),
      );
      expect(mockCheckInRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          rawTranscriptEncrypted: "Sudah minum 4 pil.",
        }),
      );
      expect(res.verdict).toBe("TERKENDALI");
    });

    it("rejects VOICE_STT submissions without a transcript", async () => {
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

      await expect(
        service.submitCheckIn("user-1", "PASIEN", {
          inputMode: "VOICE_STT",
          confirmedFacts: { transcript: "" },
        }),
      ).rejects.toThrow(BadRequestException);
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

  describe("listCheckIns", () => {
    const record = (overrides: Record<string, unknown> = {}) => ({
      id: "checkin-1",
      treatmentPlanId: "plan-1",
      checkInDate: "2026-10-22",
      attemptNumber: 1,
      reportedByRole: "PASIEN",
      inputMode: "VOICE_STT",
      medicationStatus: "SUDAH_MINUM",
      pillsTakenCount: 4,
      isDoseFulfilled: true,
      sttConfidence: 0.9,
      submittedAt: new Date("2026-10-22T08:00:00Z"),
      rawTranscriptEncrypted: "rahasia",
      extractedFactsJson: { symptoms: ["BATUK_DARAH"] },
      treatmentPlan: {
        patientUserId: "patient-1",
        facilityId: "faskes-1",
        patientUser: { name: "Ahmad" },
        facility: { name: "Puskesmas Tebet" },
      },
      ...overrides,
    });

    it("scopes a PASIEN to their own treatment plans", async () => {
      mockPlanRepo.find.mockResolvedValue([{ id: "plan-1" }]);
      mockCheckInRepo.findAndCount.mockResolvedValue([[record()], 1]);

      const res = await service.listCheckIns(
        { id: "patient-1", role: "PASIEN" },
        {} as any,
      );

      expect(mockPlanRepo.find).toHaveBeenCalledWith({
        where: { patientUserId: "patient-1" },
        select: { id: true },
      });
      const where = mockCheckInRepo.findAndCount.mock.calls[0][0].where;
      expect(where.treatmentPlanId.value).toEqual(["plan-1"]);
      expect(res.total).toBe(1);
      expect(res.items[0].patientName).toBe("Ahmad");
      expect(res.items[0].facilityName).toBe("Puskesmas Tebet");
    });

    it("returns an empty page for a PASIEN without a plan", async () => {
      mockPlanRepo.find.mockResolvedValue([]);

      const res = await service.listCheckIns(
        { id: "patient-1", role: "PASIEN" },
        {} as any,
      );

      expect(res).toEqual({ items: [], total: 0, page: 1, limit: 20 });
      expect(mockCheckInRepo.findAndCount).not.toHaveBeenCalled();
    });

    it("scopes a PMO to active assignments only", async () => {
      mockPmoRepo.find.mockResolvedValue([{ treatmentPlanId: "plan-1" }]);
      mockCheckInRepo.findAndCount.mockResolvedValue([[record()], 1]);

      await service.listCheckIns({ id: "pmo-1", role: "PMO" }, {} as any);

      expect(mockPmoRepo.find).toHaveBeenCalledWith({
        where: { pmoUserId: "pmo-1", active: true },
        select: { treatmentPlanId: true },
      });
    });

    it("scopes a NAKES to their facility", async () => {
      mockPlanRepo.find.mockResolvedValue([{ id: "plan-1" }]);
      mockCheckInRepo.findAndCount.mockResolvedValue([[record()], 1]);

      await service.listCheckIns(
        { id: "nakes-1", role: "NAKES", facilityId: "faskes-1" },
        {} as any,
      );

      expect(mockPlanRepo.find).toHaveBeenCalledWith({
        where: { facilityId: "faskes-1" },
        select: { id: true },
      });
    });

    it("returns an empty page for a NAKES without a facility", async () => {
      const res = await service.listCheckIns(
        { id: "nakes-1", role: "NAKES", facilityId: null },
        {} as any,
      );

      expect(res).toEqual({ items: [], total: 0, page: 1, limit: 20 });
      expect(mockCheckInRepo.findAndCount).not.toHaveBeenCalled();
    });

    it("does not scope an ADMIN", async () => {
      mockCheckInRepo.findAndCount.mockResolvedValue([[record()], 1]);

      await service.listCheckIns({ id: "admin-1", role: "ADMIN" }, {} as any);

      expect(mockPlanRepo.find).not.toHaveBeenCalled();
      const where = mockCheckInRepo.findAndCount.mock.calls[0][0].where;
      expect(where.treatmentPlanId).toBeUndefined();
    });

    it("rejects a treatmentPlanId outside the caller's scope", async () => {
      mockPlanRepo.find.mockResolvedValue([{ id: "plan-1" }]);

      await expect(
        service.listCheckIns(
          { id: "nakes-1", role: "NAKES", facilityId: "faskes-1" },
          { treatmentPlanId: "plan-999" } as any,
        ),
      ).rejects.toThrow(NotFoundException);
      expect(mockCheckInRepo.findAndCount).not.toHaveBeenCalled();
    });

    it("never exposes transcript or extracted facts", async () => {
      mockCheckInRepo.findAndCount.mockResolvedValue([[record()], 1]);
      mockEvalRepo.find.mockResolvedValue([
        { checkInId: "checkin-1", verdict: "PERLU_PERHATIAN" },
      ]);

      const res = await service.listCheckIns(
        { id: "admin-1", role: "ADMIN" },
        {} as any,
      );

      expect(res.items[0]).not.toHaveProperty("rawTranscriptEncrypted");
      expect(res.items[0]).not.toHaveProperty("extractedFactsJson");
      expect(res.items[0].verdict).toBe("PERLU_PERHATIAN");
      expect(mockEvalRepo.find).toHaveBeenCalledTimes(1);
    });
  });
  describe("listCheckIns filtering", () => {
    it("applies medication status and dose filters", async () => {
      mockCheckInRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.listCheckIns(
        { id: "admin-1", role: "ADMIN" },
        { medicationStatus: "BELUM_MINUM", isDoseFulfilled: false } as any,
      );

      const where = mockCheckInRepo.findAndCount.mock.calls[0][0].where;
      expect(where.medicationStatus).toBe("BELUM_MINUM");
      expect(where.isDoseFulfilled).toBe(false);
    });

    it("builds a closed date range from from/to", async () => {
      mockCheckInRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.listCheckIns(
        { id: "admin-1", role: "ADMIN" },
        { from: "2026-10-01", to: "2026-10-31" } as any,
      );

      const range = mockCheckInRepo.findAndCount.mock.calls[0][0].where.checkInDate;
      expect(range.type).toBe("between");
      expect(range.value).toEqual(["2026-10-01", "2026-10-31"]);
    });

    it("supports a single-sided date bound", async () => {
      mockCheckInRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.listCheckIns(
        { id: "admin-1", role: "ADMIN" },
        { from: "2026-10-01" } as any,
      );
      expect(
        mockCheckInRepo.findAndCount.mock.calls[0][0].where.checkInDate.type,
      ).toBe("moreThanOrEqual");

      await service.listCheckIns(
        { id: "admin-1", role: "ADMIN" },
        { to: "2026-10-31" } as any,
      );
      expect(
        mockCheckInRepo.findAndCount.mock.calls[1][0].where.checkInDate.type,
      ).toBe("lessThanOrEqual");
    });

    it("forbids a non-ADMIN facility filter", async () => {
      await expect(
        service.listCheckIns(
          { id: "nakes-1", role: "NAKES", facilityId: "faskes-1" },
          { facilityId: "faskes-9" } as any,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(mockCheckInRepo.findAndCount).not.toHaveBeenCalled();
    });

    it("applies an ADMIN facility filter", async () => {
      mockCheckInRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.listCheckIns(
        { id: "admin-1", role: "ADMIN" },
        { facilityId: "faskes-9" } as any,
      );

      const where = mockCheckInRepo.findAndCount.mock.calls[0][0].where;
      expect(where.treatmentPlan).toEqual({ facilityId: "faskes-9" });
    });
  });
});
