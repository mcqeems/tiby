/**
 * Indonesian date and time formatting.
 *
 * Every screen used to call `toLocale*("id-ID", {...})` with its own options,
 * and two files carried identical copies of a local `getLocalDateStr`. These
 * helpers are the one place that decides how a date reads.
 */

type DateInput = string | number | Date;

const toDate = (value: DateInput) => (value instanceof Date ? value : new Date(value));

/**
 * `YYYY-MM-DD` in the viewer's timezone. Use it as a map key or for date
 * equality — `toISOString()` would shift the day for anyone east of UTC.
 */
export function localDateKey(value: DateInput): string {
  const d = toDate(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** `14.30` */
export function formatTime(value: DateInput): string {
  return toDate(value).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** `12 Okt 2026` */
export function formatShortDate(value: DateInput): string {
  return toDate(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** `Oktober 2026` */
export function formatMonthYear(value: DateInput): string {
  return toDate(value).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
}

/** `12 Oktober 2026, 14.30` */
export function formatLongDateTime(value: DateInput): string {
  return toDate(value).toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** `12 Oktober 2026`, read in UTC — for values that carry no time of day. */
export function formatLongDateUtc(value: DateInput): string {
  return toDate(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Whatever `id-ID` picks by default, e.g. `24/10/2026, 14.30.00`. */
export function formatLocale(value: DateInput): string {
  return toDate(value).toLocaleString("id-ID");
}

/** Whatever `id-ID` picks by default, without the time. */
export function formatDate(value: DateInput): string {
  return toDate(value).toLocaleDateString("id-ID");
}
