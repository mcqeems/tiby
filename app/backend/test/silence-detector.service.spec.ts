import { describe, it, expect, beforeEach, vi } from "vitest";
import { SilenceDetectorService } from "../src/modules/internal/escalation/services/silence-detector.service.js";

describe("SilenceDetectorService Unit Tests", () => {
  let service: SilenceDetectorService;

  let mockPlanRepo: any;
  let mockCheckInRepo: any;
  let mockHistoryRepo: any;
  let mockTicketRepo: any;
  let mockAlertRepo: any;
  let mockEventEmitter: any;

  beforeEach(() => {
    mockPlanRepo = {
      find: vi.fn(),
      save: vi.fn((data) => Promise.resolve(data)),
    };
    mockCheckInRepo = {
      find: vi.fn().mockResolvedValue([]),
    };
    mockHistoryRepo = {
      create: vi.fn((data) => data),
      save: vi.fn((data) => Promise.resolve(data)),
    };
    mockTicketRepo = {
      create: vi.fn((data) => ({ id: "ticket-silence-id", ...data })),
      save: vi.fn((data) => Promise.resolve({ id: "ticket-silence-id", ...data })),
    };
    mockAlertRepo = {
      create: vi.fn((data) => ({ id: "alert-silence-id", ...data })),
      save: vi.fn((data) => Promise.resolve({ id: "alert-silence-id", ...data })),
    };
    mockEventEmitter = {
      emit: vi.fn(),
    };

    service = new SilenceDetectorService(
      mockPlanRepo,
      mockCheckInRepo,
      mockHistoryRepo,
      mockTicketRepo,
      mockAlertRepo,
      mockEventEmitter,
    );
  });

  it("Day 1 missed: resets streak to 0, sets silence=1, logs STREAK_RESET, emits SILENCE_H1_ESCALATION to PASIEN", async () => {
    const plan = {
      id: "plan-1",
      patientUserId: "user-1",
      facilityId: "faskes-1",
      patientState: "AKTIF",
      currentStreak: 5,
      consecutiveSilenceDays: 0,
    };
    mockPlanRepo.find.mockResolvedValue([plan]);
    mockCheckInRepo.find.mockResolvedValue([]); // missed check-in

    const res = await service.runMidnightSilenceCheck("2026-10-15");
    expect(res.processed).toBe(1);
    expect(res.silenced).toBe(1);

    expect(plan.currentStreak).toBe(0);
    expect(plan.consecutiveSilenceDays).toBe(1);
    expect(mockPlanRepo.save).toHaveBeenCalledWith(plan);

    // Verify STREAK_RESET status history
    expect(mockHistoryRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        treatmentPlanId: "plan-1",
        eventType: "STREAK_RESET",
        previousStreak: 5,
        newStreak: 0,
      }),
    );

    // Verify STREAK_RESET_WARNING alert created
    expect(mockAlertRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        facilityId: "faskes-1",
        treatmentPlanId: "plan-1",
        alertType: "STREAK_RESET_WARNING",
        severity: "WARNING",
      }),
    );

    // Verify H+1 event emitted
    expect(mockEventEmitter.emit).toHaveBeenCalledWith(
      "notification.trigger",
      expect.objectContaining({
        circumstance: "SILENCE_H1_ESCALATION",
        recipientRole: "PASIEN",
      }),
    );
  });

  it("Day 2 missed: sets silence=2, transitions to BERISIKO, increases riskScore, emits SILENCE_H2_ESCALATION to PMO", async () => {
    const plan = {
      id: "plan-1",
      patientUserId: "user-1",
      facilityId: "faskes-1",
      patientState: "AKTIF",
      currentStreak: 0,
      consecutiveSilenceDays: 1,
      riskScore: 0,
    };
    mockPlanRepo.find.mockResolvedValue([plan]);
    mockCheckInRepo.find.mockResolvedValue([]);

    await service.runMidnightSilenceCheck("2026-10-15");

    expect(plan.consecutiveSilenceDays).toBe(2);
    expect(plan.patientState).toBe("BERISIKO");
    expect(plan.riskScore).toBe(15);

    expect(mockEventEmitter.emit).toHaveBeenCalledWith(
      "notification.trigger",
      expect.objectContaining({
        circumstance: "SILENCE_H2_ESCALATION",
        recipientRole: "PMO",
      }),
    );
  });

  it("Day 3 missed: sets silence=3, creates CRITICAL SILENCE_H3 ticket, creates SILENCE_H3_WARNING alert, emits SILENCE_H3_ESCALATION", async () => {
    const plan = {
      id: "plan-1",
      patientUserId: "user-1",
      facilityId: "faskes-1",
      patientState: "BERISIKO",
      currentStreak: 0,
      consecutiveSilenceDays: 2,
      riskScore: 15,
    };
    mockPlanRepo.find.mockResolvedValue([plan]);
    mockCheckInRepo.find.mockResolvedValue([]);

    await service.runMidnightSilenceCheck("2026-10-15");

    expect(plan.consecutiveSilenceDays).toBe(3);
    expect(plan.riskScore).toBe(40); // 15 + 25

    // Verify critical SILENCE_H3 ticket
    expect(mockTicketRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        treatmentPlanId: "plan-1",
        facilityId: "faskes-1",
        triggerSource: "SILENCE_H3",
        priority: "CRITICAL",
        status: "OPEN",
      }),
    );

    // Verify FacilityAlert
    expect(mockAlertRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        facilityId: "faskes-1",
        alertType: "SILENCE_H3_WARNING",
        severity: "HIGH",
      }),
    );

    // Verify H+3 event emitted
    expect(mockEventEmitter.emit).toHaveBeenCalledWith(
      "notification.trigger",
      expect.objectContaining({
        circumstance: "SILENCE_H3_ESCALATION",
        recipientRole: "PMO",
      }),
    );
  });

  it("batches the fulfilled check-in lookup into a single query for all plans", async () => {
    const plans = [
      { id: "plan-1", patientState: "AKTIF", currentStreak: 3, consecutiveSilenceDays: 0, facilityId: "f1" },
      { id: "plan-2", patientState: "AKTIF", currentStreak: 0, consecutiveSilenceDays: 0, facilityId: "f1" },
    ];
    mockPlanRepo.find.mockResolvedValue(plans);
    // plan-1 already checked in, plan-2 did not
    mockCheckInRepo.find.mockResolvedValue([{ treatmentPlanId: "plan-1" }]);

    const res = await service.runMidnightSilenceCheck("2026-10-15");

    // one batched query, not one per plan
    expect(mockCheckInRepo.find).toHaveBeenCalledTimes(1);
    expect(mockCheckInRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ checkInDate: "2026-10-15", isDoseFulfilled: true }),
        select: { treatmentPlanId: true },
      }),
    );
    expect(res.silenced).toBe(1);
    expect(plans[0].consecutiveSilenceDays).toBe(0); // fulfilled -> untouched
    expect(plans[1].consecutiveSilenceDays).toBe(1); // missed -> incremented
  });
});
