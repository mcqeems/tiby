import { describe, expect, it } from "vitest";
import type { GuidanceCitation } from "@tiby/ts-shared";
import {
  citationIndex,
  evidenceFor,
  formatElapsed,
  splitAnswerCitations,
  thinkingStatus,
} from "@/lib/guidance";

const citation = (id: string, title = id): GuidanceCitation => ({
  citation_id: id,
  document_id: "doc",
  organization: "WHO",
  title,
  year: 2024,
  page: 3,
  section: null,
  source_url: "https://example.test/doc",
});

const CITATIONS = [citation("src-1"), citation("src-2")];

describe("splitAnswerCitations", () => {
  it("returns a single text segment when nothing is cited", () => {
    expect(splitAnswerCitations("Mual bisa muncul.", [])).toEqual([
      { kind: "text", text: "Mual bisa muncul." },
    ]);
  });

  it("splits bare and bracketed markers, mapping them to source numbers", () => {
    const segments = splitAnswerCitations(
      "Mual itu umum [src-1]. Minum obat tiap hari penting src-2.",
      CITATIONS,
    );
    expect(segments).toEqual([
      { kind: "text", text: "Mual itu umum " },
      { kind: "citation", id: "src-1", number: 1 },
      { kind: "text", text: ". Minum obat tiap hari penting " },
      { kind: "citation", id: "src-2", number: 2 },
      { kind: "text", text: "." },
    ]);
  });

  it("handles a comma separated marker group", () => {
    const segments = splitAnswerCitations("Lihat [src-1, src-2].", CITATIONS);
    expect(segments.filter((s) => s.kind === "citation").map((s) => s.id)).toEqual([
      "src-1",
      "src-2",
    ]);
  });

  it("keeps an unknown marker as text so it never becomes a dead chip", () => {
    const segments = splitAnswerCitations("Hmm [src-9].", CITATIONS);
    expect(segments).toEqual([
      { kind: "text", text: "Hmm " },
      { kind: "citation", id: "src-9", number: null },
      { kind: "text", text: "." },
    ]);
  });

  it("is case insensitive", () => {
    const segments = splitAnswerCitations("Ya [SRC-1].", CITATIONS);
    expect(segments.filter((s) => s.kind === "citation")).toEqual([
      { kind: "citation", id: "src-1", number: 1 },
    ]);
  });

  it("does not touch words that merely contain src-", () => {
    expect(splitAnswerCitations("src-of-a-word", CITATIONS)).toEqual([
      { kind: "text", text: "src-of-a-word" },
    ]);
  });
});

describe("citationIndex", () => {
  it("numbers citations from 1 in payload order", () => {
    const index = citationIndex(CITATIONS);
    expect(index.get("src-1")).toBe(1);
    expect(index.get("src-2")).toBe(2);
    expect(index.get("src-3")).toBeUndefined();
  });
});

describe("evidenceFor", () => {
  it("finds the snippet the model was allowed to use", () => {
    expect(
      evidenceFor("src-2", [
        { citation_id: "src-1", text: "first" },
        { citation_id: "src-2", text: "second" },
      ]),
    ).toBe("second");
  });

  it("returns null when no snippet came back", () => {
    expect(evidenceFor("src-9", [])).toBeNull();
  });
});

describe("thinkingStatus", () => {
  it("escalates instead of repeating one vague label", () => {
    expect(thinkingStatus(500).label).toBe("Mencari di panduan resmi...");
    expect(thinkingStatus(3_000).label).toBe("Menyusun jawaban...");
    expect(thinkingStatus(20_000).label).toBe("Masih menyusun jawaban...");
  });

  it("warns about the realistic worst case only once the wait is long", () => {
    expect(thinkingStatus(3_000).detail).not.toMatch(/satu menit/);
    expect(thinkingStatus(20_000).detail).toMatch(/satu menit/);
  });

  it("always offers a way out", () => {
    expect(thinkingStatus(0).canStop).toBe(true);
    expect(thinkingStatus(30_000).canStop).toBe(true);
  });
});

describe("formatElapsed", () => {
  it("reads as a timer", () => {
    expect(formatElapsed(0)).toBe("0:00");
    expect(formatElapsed(9_400)).toBe("0:09");
    expect(formatElapsed(65_000)).toBe("1:05");
  });
});
