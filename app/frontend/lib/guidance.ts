import type { GuidanceCitation } from "@tiby/ts-shared";

/** One piece of an answer: plain prose, or a `src-N` marker to render as a chip. */
export type AnswerSegment =
  | { kind: "text"; text: string }
  | { kind: "citation"; id: string; number: number | null };

/**
 * The AI service hands the model citation ids (`src-1`), validates that it only
 * cites ids it was given, and returns the answer as prose. Models render those
 * ids inconsistently - `src-1`, `[src-1]`, `[src-1, src-2]` - so split them out
 * for the UI to turn into chips, and keep the count honest by looking the id up
 * in the citation list (an unknown id stays plain text rather than a dead chip).
 */
export function splitAnswerCitations(
  answer: string,
  citations: GuidanceCitation[],
): AnswerSegment[] {
  const index = citationIndex(citations);
  const segments: AnswerSegment[] = [];
  const marker = /\[?(src-\d+)\]?/gi;

  let cursor = 0;
  let match = marker.exec(answer);
  while (match) {
    const before = answer.slice(cursor, match.index);
    if (before) segments.push({ kind: "text", text: before });
    const id = match[1].toLowerCase();
    segments.push({ kind: "citation", id, number: index.get(id) ?? null });
    cursor = match.index + match[0].length;
    match = marker.exec(answer);
  }

  const rest = answer.slice(cursor);
  if (rest) segments.push({ kind: "text", text: rest });
  return segments.length ? segments : [{ kind: "text", text: answer }];
}

/** 1-based position of each citation, so chips read "1", "2", ... */
export function citationIndex(citations: GuidanceCitation[]): Map<string, number> {
  return new Map(citations.map((citation, i) => [citation.citation_id, i + 1]));
}

/** The snippet the model was allowed to use for a citation, if it came back. */
export function evidenceFor(
  citationId: string,
  evidence: { citation_id: string; text: string }[],
): string | null {
  return evidence.find((item) => item.citation_id === citationId)?.text ?? null;
}

/**
 * Phase copy for the wait. Streaming is not an option here - the answer is
 * validated JSON and every failure is fail-closed - so the wait has to be
 * legible instead: say what is happening, and escalate rather than repeat one
 * vague "mencari" for a minute.
 */
export function thinkingStatus(elapsedMs: number): {
  label: string;
  detail: string;
  /** Show the stop control from the start; it is the only way out. */
  canStop: boolean;
} {
  if (elapsedMs < 2_000) {
    return {
      label: "Mencari di panduan resmi...",
      detail: "Pandu sedang membaca panduan Kemenkes/WHO.",
      canStop: true,
    };
  }
  if (elapsedMs < 15_000) {
    return {
      label: "Menyusun jawaban...",
      detail: "Bukti ditemukan, Pandu sedang merangkai jawabannya.",
      canStop: true,
    };
  }
  return {
    label: "Masih menyusun jawaban...",
    detail:
      "Pertanyaan yang butuh banyak bukti bisa memakan waktu sampai satu menit.",
    canStop: true,
  };
}

/** `1:05` — a quiet timer so a long wait never looks like a hang. */
export function formatElapsed(elapsedMs: number): string {
  const total = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
