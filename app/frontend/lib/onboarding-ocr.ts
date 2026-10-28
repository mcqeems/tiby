import type { OcrOnboardingDraft } from "@tiby/ts-shared";
import type { OnboardingPayload } from "@/lib/types/onboarding";

/**
 * What OCR may fill, and what still blocks the submit.
 *
 * The scanned card only carries these four things. Everything else on the form
 * (username, PMO, reminder time, family contact) is decided by the Nakes, so
 * OCR must never look like it supplied them.
 */
export type OcrFieldKey = "patientName" | "regimenCode" | "dailyPillQuota" | "startDate";

export const OCR_FIELD_LABELS: Record<OcrFieldKey, string> = {
  patientName: "Nama pasien",
  regimenCode: "Regimen",
  dailyPillQuota: "Kuota harian",
  startDate: "Tanggal mulai",
};

export interface MissingField {
  /** Dotted path of the form field, e.g. `patient.username`. */
  key: string;
  label: string;
}

export interface MergeResult {
  form: OnboardingPayload;
  /** Fields the draft filled because the Nakes had not touched them. */
  filled: OcrFieldKey[];
  /** Fields the draft had a value for, but the Nakes had already typed over. */
  skipped: OcrFieldKey[];
}

/**
 * Merge a draft into the form.
 *
 * "Fill only empty" is not enough: regimen and daily quota start at a default
 * (FDC-4 / 4), so an empty check would silently refuse to correct a card that
 * says FDC-3. The form tracks which of the four the Nakes has touched; OCR
 * fills the untouched ones and leaves everything they typed alone.
 */
export function mergeOcrDraft(
  form: OnboardingPayload,
  draft: OcrOnboardingDraft,
  touched: ReadonlySet<OcrFieldKey>,
): MergeResult {
  const next: OnboardingPayload = {
    ...form,
    patient: { ...form.patient },
  };
  const filled: OcrFieldKey[] = [];
  const skipped: OcrFieldKey[] = [];

  const apply = (
    key: OcrFieldKey,
    value: string | number | null | undefined,
    set: () => void,
  ) => {
    if (value === null || value === undefined || value === "") return;
    if (touched.has(key)) {
      skipped.push(key);
      return;
    }
    set();
    filled.push(key);
  };

  apply("patientName", draft.patientName, () => {
    next.patient.fullName = draft.patientName as string;
  });
  apply("regimenCode", draft.regimenCode, () => {
    next.regimenCode = draft.regimenCode as string;
  });
  apply("dailyPillQuota", draft.dailyPillQuota, () => {
    next.dailyPillQuota = draft.dailyPillQuota as number;
  });
  apply("startDate", draft.startDate, () => {
    next.startDate = draft.startDate as string;
  });

  return { form: next, filled, skipped };
}

const digits = (value: string) => value.replace(/\D/g, "");
const filled = (value: string | undefined | null) => Boolean(value && value.trim());

/**
 * Everything the Nakes must supply before `/api/faskes/onboarding` can succeed,
 * in the order the fields appear on the page so the first one can be focused.
 * Family/emergency contact is deliberately absent unless the toggle is on, in
 * which case its two fields have to arrive as a complete pair.
 */
export function missingMandatoryFields(
  form: OnboardingPayload,
  {
    pmoMode,
    hasExistingPmo,
    includeFamily,
  }: {
    pmoMode: "baru" | "existing";
    hasExistingPmo: boolean;
    includeFamily: boolean;
  },
): MissingField[] {
  const missing: MissingField[] = [];
  const need = (ok: boolean, key: string, label: string) => {
    if (!ok) missing.push({ key, label });
  };

  need(form.patient.fullName.trim().length >= 2, "patient.fullName", "Nama lengkap pasien");
  need(form.patient.username.trim().length >= 3, "patient.username", "Username pasien");
  need(digits(form.patient.whatsappNumber).length >= 8, "patient.whatsappNumber", "Nomor WhatsApp pasien");

  if (pmoMode === "existing") {
    need(hasExistingPmo, "pmo.existing", "PMO yang sudah terdaftar");
  } else {
    // `form.pmo` is a union: the id form has no name fields at all.
    const pmo = form.pmo as {
      fullName?: string;
      username?: string;
      whatsappNumber?: string;
    };
    need((pmo.fullName ?? "").trim().length >= 2, "pmo.fullName", "Nama lengkap PMO");
    need((pmo.username ?? "").trim().length >= 3, "pmo.username", "Username PMO");
    need(digits(pmo.whatsappNumber ?? "").length >= 8, "pmo.whatsappNumber", "Nomor WhatsApp PMO");
  }

  need(filled(form.regimenCode), "regimenCode", "Regimen");
  need(Number.isInteger(form.dailyPillQuota) && form.dailyPillQuota >= 1, "dailyPillQuota", "Kuota butir per hari");
  need(/^([01]\d|2[0-3]):[0-5]\d$/.test(form.reminderTimeLocal), "reminderTimeLocal", "Jam pengingat");
  need(/^\d{4}-\d{2}-\d{2}$/.test(form.startDate), "startDate", "Tanggal mulai");

  if (includeFamily) {
    need(
      (form.familyContact?.fullName ?? "").trim().length >= 2,
      "familyContact.fullName",
      "Nama kontak darurat",
    );
    need(
      digits(form.familyContact?.whatsappNumber ?? "").length >= 8,
      "familyContact.whatsappNumber",
      "Nomor WhatsApp kontak darurat",
    );
  }

  return missing;
}

/** `2026-10-28` -> `28/10/2026`, without letting a Date shift the day. */
export function formatIsoDateShort(iso: string | null | undefined): string | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return null;
  return `${day}/${month}/${year}`;
}

/** One line for the OCR result: only what the card actually yielded. */
export function ocrSummary(draft: OcrOnboardingDraft): string {
  const parts = [
    draft.patientName,
    draft.regimenCode,
    draft.dailyPillQuota ? `${draft.dailyPillQuota} butir` : null,
    formatIsoDateShort(draft.startDate),
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Kartu terbaca, tetapi tidak ada kolom yang dikenali.";
}
