import { describe, expect, it } from "vitest";
import {
  formatTodayStatusLabel,
  isCheckInLockedToday,
} from "../lib/types/check-in";

describe("today check-in lock & label helpers", () => {
  it("locks same-day check-in only when verdict is TERKENDALI", () => {
    expect(isCheckInLockedToday("TERKENDALI")).toBe(true);
    expect(isCheckInLockedToday("PERLU_PERHATIAN")).toBe(false);
    expect(isCheckInLockedToday("SEGERA_KE_FASKES")).toBe(false);
    expect(isCheckInLockedToday("BELUM_CHECK_IN")).toBe(false);
    expect(isCheckInLockedToday(null)).toBe(false);
    expect(isCheckInLockedToday(undefined)).toBe(false);
  });

  it("formats every TodayCheckInStatus cleanly in Indonesian", () => {
    expect(formatTodayStatusLabel("TERKENDALI")).toBe("Terkendali");
    expect(formatTodayStatusLabel("PERLU_PERHATIAN")).toBe("Perlu Perhatian");
    expect(formatTodayStatusLabel("SEGERA_KE_FASKES")).toBe("Segera ke Faskes");
    expect(formatTodayStatusLabel("BELUM_CHECK_IN")).toBe("Belum Check-in");
    expect(formatTodayStatusLabel(null)).toBe("Belum Check-in");
  });
});
