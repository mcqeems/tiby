import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Guards for the invariants a leak would be silent and costly:
 * zero-stigma copy, and PMO transcript blindness.
 * See AGENTS.md "Invariants (do not break)".
 *
 * These read source files instead of rendering, so they run without a DOM.
 */

const filesUnder = (dir: string, match: RegExp): string[] =>
  readdirSync(dir, { recursive: true })
    .map(String)
    .filter((f) => match.test(f))
    .map((f) => `${dir}/${f}`);

const read = (paths: string[]) =>
  paths.map((path) => ({ path, text: readFileSync(path, "utf8") }));

const offenders = (paths: string[], pattern: RegExp) =>
  read(paths)
    .filter((f) => pattern.test(f.text))
    .map((f) => f.path);

const FORBIDDEN = /TBC|Tuberkulosis|tuberkulosis/;
/** The disease name the app promises not to use, including the short form
 * that slipped into the Tanya Pandu starter questions. */
const FORBIDDEN_STRICT = /\bTB\b|anti-TB|TBC|Tuberkulosis/;

describe("zero-stigma copy", () => {
  it("outbound message surfaces never name the disease", () => {
    const files = read([
      ...filesUnder("components/push", /\.tsx$/),
      ...filesUnder("components/whatsapp", /\.tsx$/),
      ...filesUnder("components/notifications", /\.tsx$/),
    ]);
    expect(files.length).toBeGreaterThan(0);
    expect(files.filter((f) => FORBIDDEN.test(f.text)).map((f) => f.path)).toEqual([]);
  });

  it("the in-app system messages never name it", () => {
    expect(offenders(["lib/push-utils.ts"], FORBIDDEN)).toEqual([]);
  });

  it("the Tanya Pandu copy never names the disease", () => {
    const files = read(filesUnder("components/guidance", /\.tsx$/));
    expect(files.length).toBeGreaterThan(0);
    expect(files.filter((f) => FORBIDDEN_STRICT.test(f.text)).map((f) => f.path)).toEqual([]);
  });

  it("no signed-in route describes the patient by disease in its metadata", () => {
    // app/layout.tsx and app/page.tsx are the public marketing surface and
    // name the disease on purpose; everything behind auth does not.
    const files = read([
      ...filesUnder("app/admin", /page\.tsx$/),
      ...filesUnder("app/nakes", /page\.tsx$/),
      ...filesUnder("app/pmo", /page\.tsx$/),
      ...filesUnder("app/pasien", /page\.tsx$/),
      ...filesUnder("app/dashboard", /page\.tsx$/),
    ]);
    expect(files.length).toBeGreaterThan(0);
    expect(files.filter((f) => FORBIDDEN_STRICT.test(f.text)).map((f) => f.path)).toEqual([]);
  });
});

describe("PMO transcript blindness", () => {
  it("no PMO screen reads transcripts or symptom detail", () => {
    const files = read(filesUnder("app/pmo", /\.tsx$/));
    expect(files.length).toBeGreaterThan(0);
    expect(offenders(files.map((f) => f.path), /transcript/i)).toEqual([]);
  });
});

describe("consent gate", () => {
  it("both patient-facing layouts mount the consent modal", () => {
    for (const layout of ["app/pasien/layout.tsx", "app/pmo/layout.tsx"]) {
      expect(readFileSync(layout, "utf8"), layout).toContain("ConsentModal");
    }
  });
});
