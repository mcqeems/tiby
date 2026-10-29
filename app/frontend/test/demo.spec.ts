import { describe, expect, it } from "vitest";
import { formatRemaining } from "@/lib/demo";

const NOW = new Date("2026-01-01T00:00:00.000Z");

describe("formatRemaining", () => {
  it("formats two hours", () => {
    expect(formatRemaining("2026-01-01T02:00:00.000Z", NOW)).toBe("2j 0m");
  });

  it("formats hours and minutes", () => {
    expect(formatRemaining("2026-01-01T01:42:00.000Z", NOW)).toBe("1j 42m");
  });

  it("formats minutes only", () => {
    expect(formatRemaining("2026-01-01T00:07:00.000Z", NOW)).toBe("7m");
  });

  it("clamps past expiry to zero", () => {
    expect(formatRemaining("2025-12-31T23:59:00.000Z", NOW)).toBe("0m");
  });
});
