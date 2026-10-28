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
  it("checks the day that just ended in local time, not the UTC day", async () => {
    vi.useFakeTimers();
    try {
      // 2026-10-28 00:00 local (WIB). toISOString() is still 2026-10-27 17:00Z.
      vi.setSystemTime(new Date(2026, 9, 28, 0, 0, 0));
      mockPlanRepo.find.mockResolvedValue([
        { id: "plan-1", patientState: "AKTIF", currentStreak: 1, consecutiveSilenceDays: 0, facilityId: "f1" },
      ]);

      await service.runMidnightSilenceCheck();

      expect(mockCheckInRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ checkInDate: "2026-10-27" }),
        }),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("queries lost patients and only plans inside their treatment window", async () => {
    mockPlanRepo.find.mockResolvedValue([]);

    await service.runMidnightSilenceCheck("2026-10-27");

    const where = mockPlanRepo.find.mock.calls[0][0].where;
    expect(where.patientState.value).toEqual([
      "AKTIF",
      "BERISIKO",
      "PUTUS_FOLLOW_UP",
    ]);
    expect(where.startDate).toBeDefined();
    expect(where.targetEndDate).toBeDefined();
  });

  it("does not reopen an H+3 ticket after day 3", async () => {
    const plan = {
      id: "plan-1",
      patientUserId: "user-1",
      facilityId: "faskes-1",
      patientState: "BERISIKO",
      currentStreak: 0,
      consecutiveSilenceDays: 3,
      riskScore: 40,
    };
    mockPlanRepo.find.mockResolvedValue([plan]);
    mockCheckInRepo.find.mockResolvedValue([]);

    await service.runMidnightSilenceCheck("2026-10-16");

    expect(plan.consecutiveSilenceDays).toBe(4);
    expect(mockTicketRepo.save).not.toHaveBeenCalled();
    expect(mockAlertRepo.save).not.toHaveBeenCalled();
    expect(mockEventEmitter.emit).not.toHaveBeenCalled();
  });

  it("moves to PUTUS_FOLLOW_UP once at day 7", async () => {
    const plan = {
      id: "plan-1",
      patientUserId: "user-1",
      facilityId: "faskes-1",
      patientState: "BERISIKO",
      currentStreak: 0,
      consecutiveSilenceDays: 6,
      riskScore: 40,
    };
    mockPlanRepo.find.mockResolvedValue([plan]);
    mockCheckInRepo.find.mockResolvedValue([]);

    await service.runMidnightSilenceCheck("2026-10-19");

    expect(plan.consecutiveSilenceDays).toBe(7);
    expect(plan.patientState).toBe("PUTUS_FOLLOW_UP");
    expect(plan.riskScore).toBe(50);
    expect(mockHistoryRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "STATE_TRANSITION",
        newState: "PUTUS_FOLLOW_UP",
      }),
    );
    expect(mockTicketRepo.save).not.toHaveBeenCalled();
    expect(mockEventEmitter.emit).not.toHaveBeenCalled();
  });

  it("keeps counting silence for a lost patient without escalating again", async () => {
    const plan = {
      id: "plan-1",
      patientUserId: "user-1",
      facilityId: "faskes-1",
      patientState: "PUTUS_FOLLOW_UP",
      currentStreak: 0,
      consecutiveSilenceDays: 9,
      riskScore: 50,
    };
    mockPlanRepo.find.mockResolvedValue([plan]);
    mockCheckInRepo.find.mockResolvedValue([]);

    await service.runMidnightSilenceCheck("2026-10-21");

    expect(plan.consecutiveSilenceDays).toBe(10);
    expect(plan.patientState).toBe("PUTUS_FOLLOW_UP");
    expect(mockTicketRepo.save).not.toHaveBeenCalled();
    expect(mockAlertRepo.save).not.toHaveBeenCalled();
    expect(mockEventEmitter.emit).not.toHaveBeenCalled();
  });
});
