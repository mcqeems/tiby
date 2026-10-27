import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  StatsService,
  adherenceRate,
  daysRemaining,
  elapsedDays,
  toDateString,
} from "../src/modules/stats/services/stats.service.js";

const DAY_MS = 86_400_000;
const today = new Date().toISOString().slice(0, 10);
const dayOffset = (days: number) =>
  new Date(Date.parse(today) + days * DAY_MS).toISOString().slice(0, 10);

function makeService() {
  const planRepo = {
    findOne: vi.fn(),
    count: vi.fn(),
    createQueryBuilder: vi.fn(),
  };
  const checkInRepo = { find: vi.fn() };
  const evalRepo = { findOneBy: vi.fn() };
  const pmoRepo = { find: vi.fn() };
  const alertRepo = { count: vi.fn() };
  const ticketRepo = { count: vi.fn() };
  const userRepo = { count: vi.fn() };
  const facilityRepo = { count: vi.fn() };

  const service = new StatsService(
    planRepo as any,
    checkInRepo as any,
    evalRepo as any,
    pmoRepo as any,
    alertRepo as any,
    ticketRepo as any,
    userRepo as any,
    facilityRepo as any,
  );

  return {
    service,
    planRepo,
    checkInRepo,
    evalRepo,
    pmoRepo,
    alertRepo,
    ticketRepo,
    userRepo,
    facilityRepo,
  };
}

function mockQueryBuilder(rows: unknown[]) {
  const builder: any = {
    leftJoin: () => builder,
    select: () => builder,
    addSelect: () => builder,
    where: () => builder,
    andWhere: () => builder,
    setParameter: () => builder,
    groupBy: () => builder,
    getRawMany: vi.fn().mockResolvedValue(rows),
  };
  return builder;
}

describe("StatsService date maths", () => {
  it("does not count today until the dose is fulfilled", () => {
    expect(elapsedDays(dayOffset(-10), dayOffset(170), today, false)).toBe(10);
    expect(elapsedDays(dayOffset(-10), dayOffset(170), today, true)).toBe(11);
  });

  it("starts at zero on the first day with no report", () => {
    expect(elapsedDays(today, dayOffset(180), today, false)).toBe(0);
    expect(elapsedDays(today, dayOffset(180), today, true)).toBe(1);
  });

  it("stops counting at the target end date", () => {
    expect(elapsedDays(dayOffset(-30), dayOffset(-10), today, false)).toBe(21);
    expect(elapsedDays(dayOffset(-30), dayOffset(-10), today, true)).toBe(21);
  });

  it("never returns a negative day count", () => {
    expect(elapsedDays(dayOffset(5), dayOffset(100), today, false)).toBe(0);
  });

  it("keeps a local-midnight Date on its own calendar day", () => {
    expect(toDateString(new Date(2026, 9, 17))).toBe("2026-10-17");
    expect(toDateString("2026-10-17")).toBe("2026-10-17");
  });

  it("clamps days remaining at zero", () => {
    expect(daysRemaining(today, dayOffset(10))).toBe(10);
    expect(daysRemaining(today, dayOffset(-3))).toBe(0);
  });

  it("treats zero elapsed days as nothing missed", () => {
    expect(adherenceRate(0, 0)).toBe(1);
    expect(adherenceRate(3, 12)).toBe(0.25);
  });
});

describe("StatsService role payloads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an empty PASIEN payload when there is no plan", async () => {
    const { service, planRepo } = makeService();
    planRepo.findOne.mockResolvedValue(null);

    const stats = await service.getStats({ id: "pasien-1", role: "PASIEN" });

    expect(stats).toEqual({
      role: "PASIEN",
      currentStreak: 0,
      adherenceRate: 0,
      daysRemaining: 0,
      todayCheckInStatus: "BELUM_CHECK_IN",
      totalPillsTaken: 0,
      currentPhase: null,
    });
  });

  it("counts the latest attempt per day and reads today's verdict", async () => {
    const { service, planRepo, checkInRepo, evalRepo } = makeService();
    planRepo.findOne.mockResolvedValue({
      id: "plan-1",
      startDate: dayOffset(-10),
      targetEndDate: dayOffset(170),
      currentStreak: 3,
      phase: "INTENSIF",
    });
    checkInRepo.find.mockResolvedValue([
      { id: "ci-1", checkInDate: dayOffset(-2), attemptNumber: 1, pillsTakenCount: 4, isDoseFulfilled: true },
      { id: "ci-2", checkInDate: dayOffset(-1), attemptNumber: 1, pillsTakenCount: 2, isDoseFulfilled: false },
      { id: "ci-3", checkInDate: dayOffset(-1), attemptNumber: 2, pillsTakenCount: 4, isDoseFulfilled: true },
      { id: "ci-4", checkInDate: today, attemptNumber: 1, pillsTakenCount: 4, isDoseFulfilled: true },
    ]);
    evalRepo.findOneBy.mockResolvedValue({ checkInId: "ci-4", verdict: "TERKENDALI" });

    const stats = await service.getStats({ id: "pasien-1", role: "PASIEN" });

    expect(stats).toMatchObject({
      role: "PASIEN",
      currentStreak: 3,
      currentPhase: "INTENSIF",
      todayCheckInStatus: "TERKENDALI",
      totalPillsTaken: 12, // 4 + 4 (latest retry) + 4
      adherenceRate: 0.273, // 3 fulfilled days / 11 elapsed
      daysRemaining: 170,
    });
    expect(evalRepo.findOneBy).toHaveBeenCalledWith({ checkInId: "ci-4" });
  });

  it("returns zeros for a PMO without active assignments", async () => {
    const { service, pmoRepo } = makeService();
    pmoRepo.find.mockResolvedValue([]);

    const stats = await service.getStats({ id: "pmo-1", role: "PMO" });

    expect(stats).toEqual({
      role: "PMO",
      totalPatients: 0,
      checkedInToday: 0,
      pendingCheckIn: 0,
      highRiskPatients: 0,
      unreadAlerts: 0,
    });
  });

  it("deduplicates assigned plans and counts today's reports once", async () => {
    const { service, pmoRepo, checkInRepo, planRepo, alertRepo } = makeService();
    pmoRepo.find.mockResolvedValue([
      { treatmentPlanId: "plan-1" },
      { treatmentPlanId: "plan-1" },
      { treatmentPlanId: "plan-2" },
    ]);
    checkInRepo.find.mockResolvedValue([{ treatmentPlanId: "plan-1" }]);
    planRepo.count.mockResolvedValue(1);
    alertRepo.count.mockResolvedValue(2);

    const stats = await service.getStats({ id: "pmo-1", role: "PMO" });

    expect(stats).toEqual({
      role: "PMO",
      totalPatients: 2,
      checkedInToday: 1,
      pendingCheckIn: 1,
      highRiskPatients: 1,
      unreadAlerts: 2,
    });
  });

  it("returns zeros for a NAKES without a facility and never queries", async () => {
    const { service, planRepo, ticketRepo, alertRepo } = makeService();

    const stats = await service.getStats({ id: "nakes-1", role: "NAKES", facilityId: null });

    expect(stats).toEqual({
      role: "NAKES",
      totalPatients: 0,
      highRiskPatients: 0,
      openTickets: 0,
      criticalTickets: 0,
      unreadAlerts: 0,
      adherenceRate: 1,
    });
    expect(planRepo.count).not.toHaveBeenCalled();
    expect(ticketRepo.count).not.toHaveBeenCalled();
    expect(alertRepo.count).not.toHaveBeenCalled();
  });

  it("scopes NAKES counts to the facility and weights adherence", async () => {
    const { service, planRepo, ticketRepo, alertRepo } = makeService();
    planRepo.count.mockResolvedValueOnce(5).mockResolvedValueOnce(1);
    ticketRepo.count.mockResolvedValueOnce(3).mockResolvedValueOnce(2);
    alertRepo.count.mockResolvedValue(4);
    planRepo.createQueryBuilder.mockReturnValue(
      mockQueryBuilder([
        { startDate: dayOffset(-9), targetEndDate: dayOffset(170), fulfilledDays: "5", fulfilledToday: true },
        { startDate: dayOffset(-4), targetEndDate: dayOffset(170), fulfilledDays: "0", fulfilledToday: false },
      ]),
    );

    const stats = await service.getStats({ id: "nakes-1", role: "NAKES", facilityId: "faskes-1" });

    expect(stats).toEqual({
      role: "NAKES",
      totalPatients: 5,
      highRiskPatients: 1,
      openTickets: 3,
      criticalTickets: 2,
      unreadAlerts: 4,
      adherenceRate: 0.357, // 5 fulfilled / (10 + 4) elapsed
    });
  });

  it("returns platform counts for ADMIN", async () => {
    const { service, facilityRepo, userRepo, ticketRepo } = makeService();
    facilityRepo.count.mockResolvedValue(3);
    userRepo.count.mockResolvedValueOnce(4).mockResolvedValueOnce(10);
    ticketRepo.count.mockResolvedValue(6);

    const stats = await service.getStats({ id: "admin-1", role: "ADMIN" });

    expect(stats).toEqual({
      role: "ADMIN",
      totalFacilities: 3,
      totalNakes: 4,
      totalPatients: 10,
      totalActiveTickets: 6,
    });
  });
});
