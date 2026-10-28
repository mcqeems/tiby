/**
 * Pure streak/silence reconciliation, used by the backfill script.
 *
 * It mirrors what the midnight detector and the check-in guard should have
 * produced: a streak is only alive while consecutive fulfilled days reach
 * yesterday, and silence counts the days missed since the last dose.
 */

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function addDays(date: string, days: number): string {
  const parsed = new Date(`${date.slice(0, 10)}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function minDate(a: string, b: string): string {
  return a < b ? a : b;
}

export interface StreakStatsInput {
  startDate: string;
  targetEndDate: string;
  fulfilledDates: string[];
  today: string;
}

export interface StreakStats {
  currentStreak: number;
  consecutiveSilenceDays: number;
  latestFulfilled: string | null;
  lastSilenceCheckDate: string | null;
}

export function computeStreakStats(input: StreakStatsInput): StreakStats {
  const { startDate, targetEndDate, fulfilledDates, today } = input;
  const yesterday = addDays(today, -1);
  const windowEnd = minDate(targetEndDate, today);

  const dateSet = new Set(
    fulfilledDates
      .map((date) => String(date).slice(0, 10))
      .filter((date) => date >= startDate && date <= windowEnd),
  );

  const latestFulfilled = [...dateSet].sort().at(-1) ?? null;

  let currentStreak = 0;
  if (latestFulfilled && latestFulfilled >= yesterday) {
    let cursor = latestFulfilled;
    while (dateSet.has(cursor) && cursor >= startDate) {
      currentStreak += 1;
      cursor = addDays(cursor, -1);
    }
  }

  let consecutiveSilenceDays = 0;
  const missedEnd = minDate(yesterday, targetEndDate);
  if (missedEnd >= startDate) {
    let cursor = latestFulfilled
      ? addDays(latestFulfilled, 1)
      : startDate;
    if (cursor < startDate) cursor = startDate;
    while (cursor <= missedEnd) {
      consecutiveSilenceDays += 1;
      cursor = addDays(cursor, 1);
    }
  }

  const watermarkDate = minDate(yesterday, targetEndDate);
  return {
    currentStreak,
    consecutiveSilenceDays,
    latestFulfilled,
    lastSilenceCheckDate:
      watermarkDate >= startDate ? watermarkDate : null,
  };
}

/** Exported for tests of the date helpers. */
export const streakDateHelpers = { addDays, pad };
