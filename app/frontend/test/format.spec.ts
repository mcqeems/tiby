import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatLongDateUtc,
  formatLongDateTime,
  formatMonthYear,
  formatShortDate,
  formatTime,
  localDateKey,
} from "@/lib/format";

// A fixed instant: 24 October 2026, 14:30 local time.
const WHEN = new Date(2026, 9, 24, 14, 30);

describe("localDateKey", () => {
  it("returns the local calendar day, not the UTC one", () => {
    // 23:30 local on the 24th is already the 25th in UTC east of Greenwich.
    const late = new Date(2026, 9, 24, 23, 30);
    expect(localDateKey(late)).toBe("2026-10-24");
  });

  it("pads month and day", () => {
    expect(localDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("accepts an ISO string", () => {
    expect(localDateKey(WHEN.toISOString())).toBe("2026-10-24");
  });
});

describe("formatters", () => {
  it("formats the time", () => {
    expect(formatTime(WHEN)).toMatch(/^14[.:]30$/);
  });

  it("formats the short date with a short month", () => {
    expect(formatShortDate(WHEN)).toMatch(/^24 Okt 2026$/);
  });

  it("formats the month and year", () => {
    expect(formatMonthYear(WHEN)).toMatch(/^Oktober 2026$/);
  });

  it("formats the long date and time", () => {
    const s = formatLongDateTime(WHEN);
    expect(s).toContain("Oktober");
    expect(s).toContain("2026");
    expect(s).toMatch(/14[.:]30/);
  });

  it("keeps the UTC day for time-less values", () => {
    // Midnight UTC on the 24th must not read as the 23rd or the 25th.
    expect(formatLongDateUtc("2026-10-24T00:00:00.000Z")).toMatch(/^24 Oktober 2026$/);
  });

  it("formats a default locale date", () => {
    expect(formatDate(WHEN)).toMatch(/2026/);
  });
});
