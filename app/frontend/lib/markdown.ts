/** Allows only safe web, mailto, hash, or single-slash relative URLs. */
export function safeMarkdownHref(href?: string): string | null {
  const trimmed = href?.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("#")) return trimmed;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;

  try {
    const parsed = new URL(trimmed);
    if (
      parsed.protocol === "https:" ||
      parsed.protocol === "http:" ||
      parsed.protocol === "mailto:"
    ) {
      return trimmed;
    }
    return null;
  } catch {
    return null;
  }
}
