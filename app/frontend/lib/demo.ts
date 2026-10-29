/** Demo countdown text; `now` is injectable so tests stay deterministic. */
export function formatRemaining(
  expiresAt: string,
  now: Date = new Date(),
): string {
  const ms = new Date(expiresAt).getTime() - now.getTime();
  if (ms <= 0) return "0m";
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}j ${minutes}m` : `${minutes}m`;
}
