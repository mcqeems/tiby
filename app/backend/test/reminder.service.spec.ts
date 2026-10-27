import { describe, it, expect, vi } from "vitest";
import {
  ReminderService,
  isReminderDue,
  localClock,
  localDate,
} from "../src/modules/internal/reminder/reminder.service.js";
import { NotificationTriggerEvent } from "../src/common/events/notification-trigger.event.js";

const plan = (overrides: Record<string, unknown> = {}) => ({
  id: "plan-1",
  patientUserId: "pasien-1",
  timezone: "Asia/Jakarta",
  reminderTimeLocal: "08:00",
  startDate: "2026-10-01",
  targetEndDate: "2026-12-31",
  ...overrides,
});

describe("reminder time matching", () => {
  const now = new Date("2026-10-27T01:00:00.000Z"); // 08:00 in Jakarta

  it("reads the plan's own clock and date", () => {
    expect(localClock("Asia/Jakarta", now)).toBe("08:00");
    expect(localDate("Asia/Jakarta", now)).toBe("2026-10-27");
  });

  it("is due only on the matching local minute", () => {
    expect(isReminderDue(plan(), now)).toBe(true);
    expect(isReminderDue(plan({ reminderTimeLocal: "08:01" }), now)).toBe(false);
    expect(isReminderDue(plan({ timezone: "UTC", reminderTimeLocal: "01:00" }), now)).toBe(true);
    expect(isReminderDue(plan({ timezone: "UTC", reminderTimeLocal: "08:00" }), now)).toBe(false);
  });

  it("accepts a stored HH:mm:ss value", () => {
    expect(isReminderDue(plan({ reminderTimeLocal: "08:00:00" }), now)).toBe(true);
  });

  it("skips plans outside their treatment window", () => {
    expect(isReminderDue(plan({ startDate: "2026-10-28" }), now)).toBe(false);
    expect(isReminderDue(plan({ targetEndDate: "2026-10-26" }), now)).toBe(false);
  });

  it("skips an invalid timezone instead of throwing", () => {
    expect(isReminderDue(plan({ timezone: "Mars/Olympus" }), now)).toBe(false);
  });
});

function makeService() {
  const planRepo = { find: vi.fn() };
  const checkInRepo = { find: vi.fn().mockResolvedValue([]) };
  const logRepo = { find: vi.fn().mockResolvedValue([]) };
  const eventEmitter = { emit: vi.fn() };

  const service = new ReminderService(
    planRepo as any,
    checkInRepo as any,
    logRepo as any,
    eventEmitter as any,
  );

  return { service, planRepo, checkInRepo, logRepo, eventEmitter };
}

function currentJakartaMinute(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date());
}

describe("ReminderService", () => {
  it("emits one DAILY_REMINDER per due plan", async () => {
    const { service, planRepo, eventEmitter } = makeService();
    planRepo.find.mockResolvedValue([
      plan({ reminderTimeLocal: currentJakartaMinute(), startDate: "2000-01-01", targetEndDate: "2100-01-01" }),
    ]);

    await service.dispatchDueReminders();

    expect(eventEmitter.emit).toHaveBeenCalledTimes(1);
    const [name, event] = eventEmitter.emit.mock.calls[0];
    expect(name).toBe("notification.trigger");
    expect(event).toBeInstanceOf(NotificationTriggerEvent);
    expect(event).toMatchObject({
      circumstance: "DAILY_REMINDER",
      treatmentPlanId: "plan-1",
      recipientRole: "PASIEN",
      recipientUserId: "pasien-1",
    });
  });

  it("does not remind a patient who already completed today's dose", async () => {
    const { service, planRepo, checkInRepo, eventEmitter } = makeService();
    planRepo.find.mockResolvedValue([
      plan({ reminderTimeLocal: currentJakartaMinute(), startDate: "2000-01-01", targetEndDate: "2100-01-01" }),
    ]);
    checkInRepo.find.mockResolvedValue([{ treatmentPlanId: "plan-1" }]);

    await service.dispatchDueReminders();

    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it("does not double-send when a reminder was already logged today", async () => {
    const { service, planRepo, logRepo, eventEmitter } = makeService();
    planRepo.find.mockResolvedValue([
      plan({ reminderTimeLocal: currentJakartaMinute(), startDate: "2000-01-01", targetEndDate: "2100-01-01" }),
    ]);
    logRepo.find.mockResolvedValue([{ treatmentPlanId: "plan-1" }]);

    await service.dispatchDueReminders();

    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it("is idempotent across two runs in the same minute", async () => {
    const { service, planRepo, eventEmitter } = makeService();
    planRepo.find.mockResolvedValue([
      plan({ reminderTimeLocal: currentJakartaMinute(), startDate: "2000-01-01", targetEndDate: "2100-01-01" }),
    ]);

    await service.dispatchDueReminders();
    await service.dispatchDueReminders();

    expect(eventEmitter.emit).toHaveBeenCalledTimes(1);
  });

  it("ignores plans whose minute does not match", async () => {
    const { service, planRepo, checkInRepo, eventEmitter } = makeService();
    planRepo.find.mockResolvedValue([
      plan({ reminderTimeLocal: "99:99", startDate: "2000-01-01", targetEndDate: "2100-01-01" }),
    ]);

    await service.dispatchDueReminders();

    expect(eventEmitter.emit).not.toHaveBeenCalled();
    expect(checkInRepo.find).not.toHaveBeenCalled();
  });
});
