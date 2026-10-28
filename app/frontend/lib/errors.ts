/**
 * The message to show for anything a `try` block can throw.
 *
 * `err instanceof Error ? err.message : "..."` was written out thirty times
 * across the app; the fallback is what the user sees when the backend fails
 * without a message, so keep it specific at the call site.
 */
export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
