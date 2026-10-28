import { describe, it, expect } from "vitest";
import { computeStreakStats } from "../src/modules/internal/escalation/streak-reconcile.js";

const today = "2026-10-28";
const base = {
  startDate: "2026-10-01",
  targetEndDate: "2026-12-31",
  today,
};

describe("computeStreakStats", () => {
  it("counts consecutive doses ending today", () => {
    const stats = computeStreakStats({
      ...base,
      fulfilledDates: ["2026-10-26", "2026-10-27", "2026-10-28"],
    });

    expect(stats.currentStreak).toBe(3);
    expect(stats.consecutiveSilenceDays).toBe(0);
    expect(stats.latestFulfilled).toBe("2026-10-28");
  });

  it("keeps the streak when the latest dose is yesterday", () => {
    const stats = computeStreakStats({
      ...base,
      fulfilledDates: ["2026-10-25", "2026-10-26", "2026-10-27"],
    });

    expect(stats.currentStreak).toBe(3);
    expect(stats.consecutiveSilenceDays).toBe(0);
  });

  it("resets the streak and counts the missed days", () => {
    const stats = computeStreakStats({
      ...base,
      fulfilledDates: ["2026-10-22", "2026-10-23", "2026-10-24"],
    });

    expect(stats.currentStreak).toBe(0);
    expect(stats.consecutiveSilenceDays).toBe(3); // 25, 26, 27
    expect(stats.lastSilenceCheckDate).toBe("2026-10-27");
  });

  it("starts a new streak after a gap", () => {
    const stats = computeStreakStats({
      ...base,
      fulfilledDates: ["2026-10-24", "2026-10-28"],
    });

    expect(stats.currentStreak).toBe(1);
    expect(stats.consecutiveSilenceDays).toBe(0);
  });

  it("counts silence from the plan start when nothing was reported", () => {
    const stats = computeStreakStats({
      ...base,
      startDate: "2026-10-20",
      fulfilledDates: [],
    });

    expect(stats.currentStreak).toBe(0);
    expect(stats.consecutiveSilenceDays).toBe(8); // 20..27
  });

  it("clips silence and the watermark at the end date", () => {
    const stats = computeStreakStats({
      ...base,
      targetEndDate: "2026-10-24",
      fulfilledDates: [],
    });

    expect(stats.consecutiveSilenceDays).toBe(24); // 1..24
    expect(stats.lastSilenceCheckDate).toBe("2026-10-24");
  });

  it("returns no watermark before the plan starts", () => {
    const stats = computeStreakStats({
      ...base,
      startDate: today,
      fulfilledDates: [],
    });

    expect(stats.consecutiveSilenceDays).toBe(0);
    expect(stats.lastSilenceCheckDate).toBeNull();
  });

  it("ignores dates outside the treatment window", () => {
    const stats = computeStreakStats({
      ...base,
      startDate: "2026-10-26",
      fulfilledDates: ["2026-10-20", "2026-10-27"],
    });

    expect(stats.currentStreak).toBe(1);
  });
});
