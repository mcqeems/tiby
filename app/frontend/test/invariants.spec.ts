import { readFileSync } from "node:fs";
import { globSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Guards for the two invariants a leak would be silent and costly:
 * zero-stigma outbound copy, and PMO transcript blindness.
 * See AGENTS.md "Invariants (do not break)".
 */

const read = (paths: string[]) =>
  paths.map((p) => ({ path: p, text: readFileSync(p, "utf8") }));

const FORBIDDEN = /TBC|Tuberkulosis|tuberkulosis/;

describe("zero-stigma copy", () => {
  it("outbound message surfaces never name the disease", () => {
    const files = read([
      ...globSync("components/push/**/*.tsx"),
      ...globSync("components/whatsapp/**/*.tsx"),
      ...globSync("components/notifications/**/*.tsx"),
    ]);
    expect(files.length).toBeGreaterThan(0);
    const offenders = files.filter((f) => FORBIDDEN.test(f.text)).map((f) => f.path);
    expect(offenders).toEqual([]);
  });

  it("the in-app system messages rendered by the popup never name it", () => {
    const offenders = read(["lib/push-utils.ts"])
      .filter((f) => FORBIDDEN.test(f.text))
      .map((f) => f.path);
    expect(offenders).toEqual([]);
  });
});

describe("PMO transcript blindness", () => {
  it("no PMO screen reads transcripts or symptom detail", () => {
    const files = read(globSync("app/pmo/**/*.tsx"));
    expect(files.length).toBeGreaterThan(0);
    const offenders = files
      .filter((f) => /transcript/i.test(f.text))
      .map((f) => f.path);
    expect(offenders).toEqual([]);
  });
});

describe("consent gate", () => {
  it("both patient-facing layouts mount the consent modal", () => {
    for (const layout of ["app/pasien/layout.tsx", "app/pmo/layout.tsx"]) {
      const text = readFileSync(layout, "utf8");
      expect(text, layout).toContain("ConsentModal");
    }
  });
});
