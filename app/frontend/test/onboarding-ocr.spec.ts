import { describe, expect, it } from "vitest";
import type { OcrOnboardingDraft } from "@tiby/ts-shared";
import {
  formatIsoDateShort,
  mergeOcrDraft,
  missingMandatoryFields,
  ocrSummary,
} from "@/lib/onboarding-ocr";
import type { OnboardingFormState } from "@/lib/types/onboarding";

const draft = (overrides: Partial<OcrOnboardingDraft> = {}): OcrOnboardingDraft => ({
  patientName: "BUDI SANTOSO",
  regimenCode: "FDC-3",
  dailyPillQuota: 3,
  startDate: "2026-10-28",
  targetEndDate: null,
  confidence: 0.79,
  rawText: "…",
  fieldConfidence: {},
  uncertainties: [],
  ...overrides,
});

const form = (overrides: Partial<OnboardingFormState> = {}): OnboardingFormState => ({
  patient: { fullName: "", username: "", whatsappNumber: "" },
  pmo: {
    fullName: "",
    username: "",
    whatsappNumber: "",
    relationship: "KELUARGA",
  },
  familyContact: { fullName: "", whatsappNumber: "", notifyOnEscalation: true },
  regimenCode: "FDC-4",
  dailyPillQuota: 4,
  reminderTimeLocal: "08:00",
  timezone: "Asia/Jakarta",
  startDate: "",
  ...overrides,
});

const complete = () =>
  form({
    patient: {
      fullName: "Budi Santoso",
      username: "budisantoso",
      whatsappNumber: "08123456789",
    },
    pmo: {
      fullName: "Ratna Dewi",
      username: "ratnadewi",
      whatsappNumber: "08129876543",
      relationship: "KELUARGA",
    },
    startDate: "2026-10-28",
  });

describe("mergeOcrDraft", () => {
  it("fills the untouched fields, including the defaults that are not empty", () => {
    const result = mergeOcrDraft(form(), draft(), new Set());

    expect(result.form.patient.fullName).toBe("BUDI SANTOSO");
    expect(result.form.regimenCode).toBe("FDC-3");
    expect(result.form.dailyPillQuota).toBe(3);
    expect(result.form.startDate).toBe("2026-10-28");
    expect(result.filled).toEqual(["patientName", "regimenCode", "dailyPillQuota", "startDate"]);
    expect(result.skipped).toEqual([]);
  });

  it("never overwrites a value the Nakes typed", () => {
    const result = mergeOcrDraft(form(), draft(), new Set(["dailyPillQuota", "patientName"]));

    expect(result.form.dailyPillQuota).toBe(4);
    expect(result.form.patient.fullName).toBe("");
    expect(result.form.regimenCode).toBe("FDC-3");
    expect(result.filled).toEqual(["regimenCode", "startDate"]);
    expect(result.skipped).toEqual(["patientName", "dailyPillQuota"]);
  });

  it("leaves fields the card did not yield alone", () => {
    const result = mergeOcrDraft(
      form(),
      draft({ patientName: null, regimenCode: null, dailyPillQuota: null, startDate: null }),
      new Set(),
    );

    expect(result.filled).toEqual([]);
    expect(result.skipped).toEqual([]);
    expect(result.form.patient.fullName).toBe("");
    expect(result.form.startDate).toBe("");
  });
});

describe("missingMandatoryFields", () => {
  it("reports every empty mandatory field on a fresh form, in page order", () => {
    const missing = missingMandatoryFields(form(), {
      pmoMode: "baru",
      hasExistingPmo: false,
      includeFamily: false,
    });

    expect(missing.map((m) => m.key)).toEqual([
      "patient.fullName",
      "patient.username",
      "patient.whatsappNumber",
      "pmo.fullName",
      "pmo.username",
      "pmo.whatsappNumber",
      "startDate",
    ]);
  });

  it("is empty once the mandatory fields are complete", () => {
    expect(
      missingMandatoryFields(complete(), {
        pmoMode: "baru",
        hasExistingPmo: false,
        includeFamily: false,
      }),
    ).toEqual([]);
  });

  it("accepts a chosen existing PMO instead of its details", () => {
    const withExisting = form({
      patient: complete().patient,
      startDate: "2026-10-28",
    });

    expect(
      missingMandatoryFields(withExisting, {
        pmoMode: "existing",
        hasExistingPmo: false,
        includeFamily: false,
      }).map((m) => m.key),
    ).toEqual(["pmo.existing"]);

    expect(
      missingMandatoryFields(withExisting, {
        pmoMode: "existing",
        hasExistingPmo: true,
        includeFamily: false,
      }),
    ).toEqual([]);
  });

  it("requires both family fields only when the toggle is on", () => {
    const base = complete();
    const opts = { pmoMode: "baru" as const, hasExistingPmo: false };

    expect(missingMandatoryFields(base, { ...opts, includeFamily: false })).toEqual([]);
    expect(
      missingMandatoryFields(base, { ...opts, includeFamily: true }).map((m) => m.key),
    ).toEqual(["familyContact.fullName", "familyContact.whatsappNumber"]);
  });

  it("counts digits, so punctuation-only numbers cannot pass", () => {
    const missing = missingMandatoryFields(
      form({
        patient: { fullName: "Budi", username: "budi", whatsappNumber: "---" },
      }),
      { pmoMode: "existing", hasExistingPmo: true, includeFamily: false },
    );
    expect(missing.map((m) => m.key)).toContain("patient.whatsappNumber");
  });
});

describe("ocrSummary", () => {
  it("lists only what the card yielded", () => {
    expect(ocrSummary(draft())).toBe("BUDI SANTOSO · FDC-3 · 3 butir · 28/10/2026");
  });

  it("says so when nothing was recognised", () => {
    expect(
      ocrSummary(
        draft({ patientName: null, regimenCode: null, dailyPillQuota: null, startDate: null }),
      ),
    ).toMatch(/tidak ada kolom/);
  });
});

describe("formatIsoDateShort", () => {
  it("formats without a timezone round-trip", () => {
    expect(formatIsoDateShort("2026-10-28")).toBe("28/10/2026");
  });

  it("returns null for missing or malformed input", () => {
    expect(formatIsoDateShort(null)).toBeNull();
    expect(formatIsoDateShort("28-10-2026")).toBeNull();
  });
});
