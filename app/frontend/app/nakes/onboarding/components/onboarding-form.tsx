"use client";

import { startTransition, useEffect, useState } from "react";
import { SkeletonRegion, SkeletonRows } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/errors";
import { formatLongDateUtc } from "@/lib/format";
import { usersApi } from "@/lib/api/users";
import { onboardingApi } from "@/lib/api/onboarding";
import {
  mergeOcrDraft,
  missingMandatoryFields,
  ocrSummary,
  OCR_FIELD_LABELS,
  type OcrFieldKey,
} from "@/lib/onboarding-ocr";
import { usePopup } from "@/components/ui/popup-provider";
import PublicLoading from "@/components/ui/public-loading";
import OnboardingSuccessCard from "./onboarding-success-card";
import type { OcrOnboardingDraft } from "@tiby/ts-shared";
import type {
  OnboardingFormState,
  CreateOnboardingDto,
  OnboardingCredentials,
  PmoRelationship,
} from "@/lib/types/onboarding";
import {
  AlertCircle,
  Camera,
  UserPlus,
  Users,
  Search,
  Check,
  PhoneCall,
  Send,
  Pill,
  UserCheck,
  X,
  User,
  AtSign,
  Phone,
  Hash,
  Clock,
  CalendarDays,
  ChevronDown,
  ArrowRight,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { notify } from "@/lib/toast";
type PmoMode = "baru" | "existing";

type ExistingUser = {
  id: string;
  username: string;
  name: string;
  role: string;
  facilityId?: string | null;
  whatsappNumber?: string;
};

const inputCls =
  "peer h-11 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-tiby-ink placeholder:text-gray-400 shadow-[0_1px_2px_rgba(16,24,40,0.03)] transition hover:border-tiby-teal-200 focus:border-tiby-teal-600 focus:outline-none focus:ring-4 focus:ring-tiby-teal-600/10";

const cardCls =
  "rounded-2xl border border-tiby-teal-100 bg-white shadow-[0_1px_3px_rgba(16,24,40,0.05)]";

const STEPS = [
  { id: "langkah-1", label: "Data Pasien" },
  { id: "langkah-2", label: "PMO" },
  { id: "langkah-3", label: "Rencana Terapi" },
];



function Stepper() {
  return (
    <nav
      aria-label="Langkah pendaftaran"
      className={`${cardCls} px-4 py-3 sm:px-6`}
    >
      <ol className="flex items-center">
        {STEPS.map((step, i) => (
          <li
            key={step.id}
            className={`flex items-center ${
              i < STEPS.length - 1 ? "flex-1" : ""
            }`}
          >
            <a
              href={`#${step.id}`}
              className="group flex items-center gap-2.5 rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-tiby-teal-600"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tiby-teal-600 text-xs font-bold text-white shadow-sm ring-4 ring-tiby-teal-50 transition group-hover:bg-tiby-teal-700">
                {i + 1}
              </span>
              <span className="hidden text-xs font-semibold text-tiby-ink sm:inline">
                {step.label}
              </span>
            </a>
            {i < STEPS.length - 1 && (
              <span
                aria-hidden="true"
                className="mx-3 h-px flex-1 bg-tiby-teal-100 sm:mx-4"
              />
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function SectionCard({
  id,
  icon: Icon,
  title,
  description,
  aside,
  children,
}: {
  id?: string;
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description?: string;
  aside?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section id={id} className={`${cardCls} scroll-mt-24 overflow-hidden`}>
      <header
        className={`flex flex-col gap-3 bg-linear-to-r from-tiby-teal-50/80 to-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 ${
          children ? "border-b border-tiby-teal-100/70" : ""
        }`}
      >
        <div className="flex items-center gap-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-tiby-teal-700 shadow-sm ring-1 ring-tiby-teal-100">
            <Icon className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0">
            <h3 className="font-heading text-base font-semibold leading-tight text-tiby-ink">
              {title}
            </h3>
            {description && (
              <p className="mt-0.5 text-xs text-tiby-muted">{description}</p>
            )}
          </div>
        </div>
        {aside}
      </header>
      {children && <div className="p-5 sm:p-6">{children}</div>}
    </section>
  );
}

function Field({
  label,
  required,
  hint,
  icon: Icon,
  children,
  fieldKey,
  error,
  fromCard,
  confidence,
  wiggleToken,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  /** Dotted form path, so a missing field can be focused by name. */
  fieldKey?: string;
  /** Shown under the field, and rings it red. */
  error?: string;
  /** True when OCR supplied this value. */
  fromCard?: boolean;
  confidence?: number;
  /** Bump to replay the one-shot nudge. */
  wiggleToken?: number;
}) {
  return (
    <label className="block" data-field={fieldKey}>
      <span className="mb-1.5 flex flex-wrap items-center gap-1 text-xs font-semibold text-tiby-ink">
        {label}
        {required && (
          <span aria-hidden="true" className="text-red-500">
            *
          </span>
        )}
        {fromCard && (
          <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-tiby-teal-50 px-2 py-0.5 text-[10px] font-semibold text-tiby-teal-700 ring-1 ring-tiby-teal-100">
            dari kartu
            {typeof confidence === "number" && (
              <span className="text-tiby-teal-600/70">
                {Math.round(confidence * 100)}%
              </span>
            )}
          </span>
        )}
      </span>
      <span
        key={wiggleToken}
        className={`relative block rounded-xl ${
          error ? "ring-2 ring-red-400/80 motion-safe:animate-wiggle" : ""
        }`}
      >
        {children}
        {Icon && (
          <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition-colors peer-focus:text-tiby-teal-600" />
        )}
      </span>
      {error ? (
        <span
          role="alert"
          className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-red-600"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {error}
        </span>
      ) : (
        hint && (
          <span className="mt-1.5 block text-[11px] text-tiby-muted">
            {hint}
          </span>
        )
      )}
    </label>
  );
}

function Avatar({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-xl bg-tiby-teal-600 font-semibold text-white shadow-sm ${
        size === "lg" ? "h-11 w-11 text-sm" : "h-9 w-9 text-xs"
      }`}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

export default function OnboardingForm() {
  const { confirm } = usePopup();

  const [form, setForm] = useState<OnboardingFormState>({
    patient: { fullName: "", username: "", whatsappNumber: "" },
    pmo: {
      fullName: "",
      username: "",
      whatsappNumber: "",
      relationship: "KELUARGA" as PmoRelationship,
    },
    familyContact: {
      fullName: "",
      whatsappNumber: "",
      notifyOnEscalation: true,
    },
    regimenCode: "FDC-4",
    dailyPillQuota: 4,
    reminderTimeLocal: "08:00",
    timezone: "Asia/Jakarta",
    startDate: "",
  });

  const [pmoMode, setPmoMode] = useState<PmoMode>("baru");
  const [existingUsers, setExistingUsers] = useState<ExistingUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedExistingPmo, setSelectedExistingPmo] =
    useState<ExistingUser | null>(null);
  const [usersSearch, setUsersSearch] = useState("");

  const [includeFamily, setIncludeFamily] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<{
    draft: OcrOnboardingDraft;
    filled: OcrFieldKey[];
    skipped: OcrFieldKey[];
  } | null>(null);
  const [ocrPreview, setOcrPreview] = useState<string | null>(null);
  const [showOcrText, setShowOcrText] = useState(false);
  /** Which OCR-fillable fields the Nakes has typed in since the scan. */
  const [touched, setTouched] = useState<ReadonlySet<OcrFieldKey>>(new Set());
  /** Red rings + inline messages start only after a scan, never on a blank form. */
  const [highlightMissing, setHighlightMissing] = useState(false);
  const [wiggleToken, setWiggleToken] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [createdCredentials, setCreatedCredentials] =
    useState<OnboardingCredentials | null>(null);

  // Release the preview blob when it is replaced or the page unmounts.
  useEffect(
    () => () => {
      if (ocrPreview) URL.revokeObjectURL(ocrPreview);
    },
    [ocrPreview],
  );

  const missing = missingMandatoryFields(form, {
    pmoMode,
    hasExistingPmo: Boolean(selectedExistingPmo),
    includeFamily,
  });
  const missingLabels = new Map(missing.map((item) => [item.key, item.label]));
  const errorFor = (key: string) =>
    highlightMissing ? missingLabels.get(key) : undefined;
  const confidenceFor = (key: OcrFieldKey) =>
    ocrResult?.draft.fieldConfidence?.[key];
  const fromCard = (key: OcrFieldKey) =>
    Boolean(ocrResult?.filled.includes(key)) && !touched.has(key);

  const markTouched = (key: OcrFieldKey) =>
    setTouched((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));

  const focusField = (key: string) => {
    const wrapper = document.querySelector<HTMLElement>(`[data-field="${key}"]`);
    wrapper?.scrollIntoView({ block: "center", behavior: "smooth" });
    wrapper?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
  };

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    startTransition(() => {
      setForm((prev) =>
        prev.startDate ? prev : { ...prev, startDate: today },
      );
    });
  }, []);

  const handleSwitchToExistingPmo = async () => {
    setPmoMode("existing");
    if (existingUsers.length > 0) return;

    setLoadingUsers(true);
    try {
      const res = await usersApi.list({ role: "PMO", limit: 100 });
      setExistingUsers(res.items as ExistingUser[]);
    } catch {
      setExistingUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSelectExistingPmo = (user: ExistingUser) => {
    setSelectedExistingPmo(user);
    setForm((prev) => ({
      ...prev,
      pmo: {
        ...prev.pmo,
        fullName: user.name,
        username: user.username,
        whatsappNumber: user.whatsappNumber || prev.pmo.whatsappNumber || "-",
      },
    }));
  };

  const handleOcrFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrLoading(true);
    setOcrPreview(URL.createObjectURL(file));

    try {
      const draft = await onboardingApi.ocrExtract(file);
      const merged = mergeOcrDraft(form, draft, touched);

      setForm(merged.form);
      setOcrResult({ draft, filled: merged.filled, skipped: merged.skipped });
      setShowOcrText(false);

      // The scan only proposes values; every remaining mandatory field is now
      // flagged, because the Nakes is about to submit a treatment plan.
      const stillMissing = missingMandatoryFields(merged.form, {
        pmoMode,
        hasExistingPmo: Boolean(selectedExistingPmo),
        includeFamily,
      });
      setHighlightMissing(true);
      setWiggleToken((token) => token + 1);

      if (stillMissing.length > 0) {
        const labels = stillMissing
          .slice(0, 3)
          .map((field) => field.label)
          .join(", ");
        notify.warning(`${stillMissing.length} kolom wajib masih kosong`, `Kartu terbaca, tetapi ${labels}${ stillMissing.length > 3 ? ", dan lainnya" : "" } belum terisi. Lengkapi dulu sebelum menerbitkan akun.`);
        focusField(stillMissing[0].key);
      } else {
        notify.success("Semua kolom wajib sudah terisi", `Dari kartu: ${ocrSummary(draft)}. Periksa lagi sebelum menerbitkan akun.`);
      }
    } catch (err: unknown) {
      notify.warning("Foto Tidak Terbaca Otomatis", errorMessage(err, "Pastikan foto kartu pengobatan cukup terang, atau isi kolom formulir secara manual.", ));
    } finally {
      setOcrLoading(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !form.patient.whatsappNumber ||
      form.patient.whatsappNumber.length < 8
    ) {
      notify.warning("Nomor WhatsApp Terlalu Pendek", "Nomor WhatsApp pasien harus diisi minimal 8 digit angka yang valid.");
      return;
    }

    const pmoNameTarget = selectedExistingPmo
      ? selectedExistingPmo.name
      : form.pmo.fullName;

    const isConfirmed = await confirm({
      variant: "info",
      badgeText: "Verifikasi Data",
      title: `Terbitkan akun untuk ${form.patient.fullName}?`,
      description: `Sistem akan menghubungkan pasien dengan PMO (${pmoNameTarget}) dengan regimen ${form.regimenCode} (${form.dailyPillQuota} butir per hari).`,
      confirmLabel: "Ya, Terbitkan Akun",
      cancelLabel: "Periksa Kembali",
    });

    if (!isConfirmed) return;

    setSubmitting(true);

    try {
      // Collapse the loose form state into the contract union at the boundary.
      const payload: CreateOnboardingDto = {
        patient: form.patient,
        regimenCode: form.regimenCode,
        dailyPillQuota: form.dailyPillQuota,
        reminderTimeLocal: form.reminderTimeLocal,
        timezone: form.timezone,
        startDate: form.startDate,
        familyContact:
          includeFamily && form.familyContact?.fullName
            ? form.familyContact
            : undefined,
        pmo:
          pmoMode === "existing" && selectedExistingPmo
            ? { id: selectedExistingPmo.id, relationship: form.pmo.relationship }
            : {
                fullName: form.pmo.fullName,
                username: form.pmo.username,
                whatsappNumber: form.pmo.whatsappNumber,
                relationship: form.pmo.relationship,
              },
      };

      const creds = await onboardingApi.onboard(payload);

      setCreatedCredentials({
        ...creds,
        pmoCreated: creds.pmoCreated ?? pmoMode === "baru",
      });

      notify.success("Akun dan Terapi Berhasil Dibuat", "Silakan salin informasi login sementara Pasien pada kartu di layar sebelum meninggalkan halaman ini.");
    } catch (err: unknown) {
      notify.error("Pendaftaran Tidak Berhasil", errorMessage(err, "Terjadi kendala saat menerbitkan rencana terapi. Pastikan data terisi dengan benar."));
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setCreatedCredentials(null);
    setSelectedExistingPmo(null);
    setPmoMode("baru");
    setUsersSearch("");
    setForm({
      patient: { fullName: "", username: "", whatsappNumber: "" },
      pmo: {
        fullName: "",
        username: "",
        whatsappNumber: "",
        relationship: "KELUARGA",
      },
      familyContact: {
        fullName: "",
        whatsappNumber: "",
        notifyOnEscalation: true,
      },
      regimenCode: "FDC-4",
      dailyPillQuota: 4,
      reminderTimeLocal: "08:00",
      timezone: "Asia/Jakarta",
      startDate: new Date().toISOString().slice(0, 10),
    });
  };

  const filteredUsers = existingUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(usersSearch.toLowerCase()) ||
      u.username.toLowerCase().includes(usersSearch.toLowerCase()),
  );

  return (
    <div className="space-y-5">
      {submitting && (
        <PublicLoading
          message="Menerbitkan akun dan rencana terapi pasien..."
          fullScreen
        />
      )}

      {createdCredentials && (
        <OnboardingSuccessCard
          credentials={createdCredentials}
          onReset={resetForm}
        />
      )}

      {!createdCredentials && <Stepper />}

      {!createdCredentials && (
        <div className="relative isolate overflow-hidden rounded-2xl bg-linear-to-br from-tiby-teal-600 to-tiby-teal-700 p-5 text-white shadow-[0_8px_24px_-8px_rgba(13,148,136,0.45)] sm:p-6">
          <span
            aria-hidden="true"
            className="absolute -right-10 -top-12 -z-10 h-44 w-44 rounded-full bg-white/10"
          />
          <span
            aria-hidden="true"
            className="absolute -bottom-16 right-24 -z-10 h-40 w-40 rounded-full bg-white/5"
          />

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
                <Camera className="h-6 w-6" />
              </span>
              <div>
                <h3 className="font-heading text-base font-semibold">
                  Pindai Kartu Pengobatan (OCR)
                </h3>
                <p className="mt-0.5 max-w-md text-xs leading-relaxed text-white/80">
                  Unggah foto kartu pengobatan pasien untuk mengisi formulir
                  secara otomatis.
                </p>
              </div>
            </div>

            <label
              className={`relative inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-semibold text-tiby-teal-700 shadow-sm transition focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-white ${
                ocrLoading
                  ? "cursor-wait opacity-90"
                  : "cursor-pointer hover:-translate-y-0.5 hover:shadow-md"
              }`}
            >
              {ocrLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
              <span>{ocrLoading ? "Mengekstrak..." : "Unggah Foto Kartu"}</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleOcrFile}
                disabled={ocrLoading}
                className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-wait"
              />
            </label>
          </div>

          {ocrResult && (
            <div className="mt-4 rounded-2xl border border-white/25 bg-white/10 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">
                    Hasil pembacaan
                  </p>
                  <p className="mt-1 text-xs font-semibold text-white">
                    {ocrSummary(ocrResult.draft)}
                  </p>
                  {ocrResult.skipped.length > 0 && (
                    <p className="mt-1 text-[11px] leading-relaxed text-white/75">
                      Tidak ditimpa karena sudah Anda isi:{" "}
                      {ocrResult.skipped
                        .map((key) => OCR_FIELD_LABELS[key])
                        .join(", ")}
                      .
                    </p>
                  )}
                </div>

                {ocrPreview && (
                  // The scan is only a draft: show the photo beside the fields
                  // so they can be checked against the card.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={ocrPreview}
                    alt="Pratinjau kartu pengobatan yang dipindai"
                    className="h-16 w-24 rounded-lg object-cover ring-1 ring-white/30"
                  />
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {(Object.keys(OCR_FIELD_LABELS) as OcrFieldKey[]).map((key) => {
                  const filledNow = ocrResult.filled.includes(key);
                  const value = ocrResult.draft[key];
                  const confidence = ocrResult.draft.fieldConfidence?.[key];
                  return (
                    <span
                      key={key}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                        filledNow
                          ? "bg-white text-tiby-teal-700"
                          : value
                            ? "bg-amber-200/90 text-amber-900"
                            : "bg-white/15 text-white/70 ring-1 ring-white/25"
                      }`}
                    >
                      {OCR_FIELD_LABELS[key]}
                      {typeof confidence === "number" && value ? (
                        <span className="font-bold">
                          {Math.round(confidence * 100)}%
                        </span>
                      ) : null}
                      {!value && <span className="font-normal">tidak terbaca</span>}
                    </span>
                  );
                })}
              </div>

              {ocrResult.draft.rawText && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowOcrText((open) => !open)}
                    aria-expanded={showOcrText}
                    className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-white/90 underline decoration-white/40 underline-offset-2 hover:text-white"
                  >
                    {showOcrText ? "Sembunyikan teks terbaca" : "Lihat teks terbaca"}
                  </button>
                  {showOcrText && (
                    <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-xl bg-black/25 p-3 text-[10px] leading-relaxed text-white/80">
                      {ocrResult.draft.rawText}
                    </pre>
                  )}
                </>
              )}

              {missing.length > 0 && (
                <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-amber-100/90 px-3 py-2 text-[11px] font-semibold text-amber-900">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {missing.length} kolom wajib belum terisi. Kolom yang ditandai
                  merah harus dilengkapi sebelum akun bisa diterbitkan.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {!createdCredentials && (
        <form onSubmit={handleSubmit} className="space-y-5">
          <SectionCard
            id="langkah-1"
            icon={UserCheck}
            eyebrow="Langkah 1 dari 3"
            title="Informasi Pasien"
            description="Data akun yang akan digunakan pasien untuk masuk ke aplikasi."
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Field
                label="Nama Lengkap Pasien"
                required
                icon={User}
                fieldKey="patient.fullName"
                error={errorFor("patient.fullName")}
                fromCard={fromCard("patientName")}
                confidence={confidenceFor("patientName")}
                wiggleToken={wiggleToken}
              >
                <input
                  type="text"
                  required
                  value={form.patient.fullName}
                  onChange={(e) => {
                    markTouched("patientName");
                    setForm({
                      ...form,
                      patient: { ...form.patient, fullName: e.target.value },
                    });
                  }}
                  placeholder="cth: Budi Santoso"
                  className={`${inputCls} pl-10`}
                />
              </Field>
              <Field
                label="Username Pasien"
                required
                icon={AtSign}
                fieldKey="patient.username"
                error={errorFor("patient.username")}
                wiggleToken={wiggleToken}
                hint="3–30 karakter."
              >
                <input
                  type="text"
                  required
                  minLength={3}
                  maxLength={30}
                  value={form.patient.username}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      patient: { ...form.patient, username: e.target.value },
                    })
                  }
                  placeholder="cth: budisantoso"
                  className={`${inputCls} pl-10`}
                />
              </Field>
              <Field
                label="Nomor WhatsApp Pasien"
                required
                icon={Phone}
                fieldKey="patient.whatsappNumber"
                error={errorFor("patient.whatsappNumber")}
                wiggleToken={wiggleToken}
                hint="Minimal 8 digit angka."
              >
                <input
                  type="tel"
                  required
                  minLength={8}
                  value={form.patient.whatsappNumber}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      patient: {
                        ...form.patient,
                        whatsappNumber: e.target.value,
                      },
                    })
                  }
                  placeholder="cth: 08123456789"
                  className={`${inputCls} pl-10`}
                />
              </Field>
            </div>
          </SectionCard>

          <SectionCard
            id="langkah-2"
            icon={Users}
            eyebrow="Langkah 2 dari 3"
            title="Pengawas Menelan Obat (PMO)"
            description="Orang yang mendampingi dan memantau kepatuhan minum obat pasien."
            aside={
              <div
                role="group"
                aria-label="Mode PMO"
                className="inline-flex items-center gap-1 self-start rounded-xl border border-gray-200 bg-gray-100/70 p-1 sm:self-auto"
              >
                <button
                  type="button"
                  aria-pressed={pmoMode === "baru"}
                  onClick={() => {
                    setPmoMode("baru");
                    setSelectedExistingPmo(null);
                    setForm((prev) => ({
                      ...prev,
                      pmo: {
                        fullName: "",
                        username: "",
                        whatsappNumber: "",
                        relationship: prev.pmo.relationship,
                      },
                    }));
                  }}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    pmoMode === "baru"
                      ? "bg-white text-tiby-teal-700 shadow-sm ring-1 ring-black/5"
                      : "text-tiby-muted hover:text-tiby-ink"
                  }`}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Buat Baru</span>
                </button>
                <button
                  type="button"
                  aria-pressed={pmoMode === "existing"}
                  onClick={handleSwitchToExistingPmo}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    pmoMode === "existing"
                      ? "bg-white text-tiby-teal-700 shadow-sm ring-1 ring-black/5"
                      : "text-tiby-muted hover:text-tiby-ink"
                  }`}
                >
                  <Search className="h-3.5 w-3.5" />
                  <span>Pilih Terdaftar</span>
                </button>
              </div>
            }
          >
            {pmoMode === "existing" && !selectedExistingPmo && (
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    value={usersSearch}
                    onChange={(e) => setUsersSearch(e.target.value)}
                    placeholder="Cari nama atau username PMO..."
                    className={`${inputCls} pl-10`}
                  />
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition-colors peer-focus:text-tiby-teal-600" />
                </div>

                {loadingUsers ? (
                  <SkeletonRegion label="Memuat daftar pengawas">
                    <SkeletonRows
                      rows={3}
                      avatar
                      rowClassName="rounded-xl border border-gray-100 p-3"
                    />
                  </SkeletonRegion>
                ) : filteredUsers.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-tiby-teal-100 bg-tiby-teal-50/30 px-4 py-8 text-center">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-tiby-muted ring-1 ring-tiby-teal-100">
                      <Search className="h-4 w-4" />
                    </span>
                    <p className="text-xs font-medium text-tiby-muted">
                      Tidak ada PMO ditemukan.
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="mb-2 text-[11px] font-medium text-tiby-muted">
                      {filteredUsers.length} PMO terdaftar
                    </p>
                    <div className="max-h-60 divide-y divide-tiby-teal-50 overflow-y-auto rounded-xl border border-tiby-teal-100">
                      {filteredUsers.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => handleSelectExistingPmo(user)}
                          className="group flex w-full cursor-pointer items-center gap-3 bg-white px-4 py-3 text-left transition hover:bg-tiby-teal-50/60"
                        >
                          <Avatar name={user.name} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-tiby-ink">
                              {user.name}
                            </span>
                            <span className="block truncate font-mono text-[11px] text-tiby-muted">
                              @{user.username}
                            </span>
                          </span>
                          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-tiby-teal-700 opacity-70 transition group-hover:opacity-100">
                            Pilih
                            <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {pmoMode === "existing" && selectedExistingPmo && (
              <div className="flex flex-col gap-3 rounded-xl border border-tiby-teal-200 bg-linear-to-r from-tiby-teal-50/80 to-white p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3.5">
                  <span className="relative">
                    <Avatar name={selectedExistingPmo.name} size="lg" />
                    <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-white">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-tiby-ink">
                      {selectedExistingPmo.name}
                    </p>
                    <p className="truncate font-mono text-[11px] text-tiby-muted">
                      @{selectedExistingPmo.username} (PMO Terdaftar)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedExistingPmo(null)}
                  className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-600 shadow-xs transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Ganti PMO</span>
                </button>
              </div>
            )}

            {pmoMode === "baru" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field
                  label="Nama Lengkap PMO"
                  required
                  icon={User}
                  fieldKey="pmo.fullName"
                  error={errorFor("pmo.fullName")}
                  wiggleToken={wiggleToken}
                >
                  <input
                    type="text"
                    required
                    value={form.pmo.fullName}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        pmo: { ...form.pmo, fullName: e.target.value },
                      })
                    }
                    placeholder="cth: Ratna Dewi"
                    className={`${inputCls} pl-10`}
                  />
                </Field>
                <Field
                  label="Username PMO"
                  required
                  icon={AtSign}
                  fieldKey="pmo.username"
                  error={errorFor("pmo.username")}
                  wiggleToken={wiggleToken}
                  hint="3–30 karakter."
                >
                  <input
                    type="text"
                    required
                    minLength={3}
                    maxLength={30}
                    value={form.pmo.username}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        pmo: { ...form.pmo, username: e.target.value },
                      })
                    }
                    placeholder="cth: ratnadewi"
                    className={`${inputCls} pl-10`}
                  />
                </Field>
                <Field
                  label="WhatsApp PMO"
                  required
                  icon={Phone}
                  fieldKey="pmo.whatsappNumber"
                  error={errorFor("pmo.whatsappNumber")}
                  wiggleToken={wiggleToken}
                >
                  <input
                    type="tel"
                    required
                    value={form.pmo.whatsappNumber}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        pmo: { ...form.pmo, whatsappNumber: e.target.value },
                      })
                    }
                    placeholder="cth: 08812312345"
                    className={`${inputCls} pl-10`}
                  />
                </Field>
                <Field label="Hubungan" required>
                  <select
                    value={form.pmo.relationship}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        pmo: {
                          ...form.pmo,
                          relationship: e.target.value as PmoRelationship,
                        },
                      })
                    }
                    className={`${inputCls} cursor-pointer appearance-none pr-10`}
                  >
                    <option value="KELUARGA">Keluarga</option>
                    <option value="KADER">Kader Kesehatan</option>
                    <option value="NAKES">Tenaga Kesehatan</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition-colors peer-focus:text-tiby-teal-600" />
                </Field>
              </div>
            )}
          </SectionCard>

          <SectionCard
            id="langkah-3"
            icon={Pill}
            eyebrow="Langkah 3 dari 3"
            title="Rencana Terapi Obat"
            description="Regimen, dosis harian, dan jadwal pengingat minum obat."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field
                label="Regimen"
                required
                icon={Pill}
                fieldKey="regimenCode"
                error={errorFor("regimenCode")}
                fromCard={fromCard("regimenCode")}
                confidence={confidenceFor("regimenCode")}
                wiggleToken={wiggleToken}
              >
                <input
                  type="text"
                  required
                  value={form.regimenCode}
                  onChange={(e) => {
                    markTouched("regimenCode");
                    setForm({ ...form, regimenCode: e.target.value });
                  }}
                  placeholder="cth: FDC-4"
                  className={`${inputCls} pl-10`}
                />
              </Field>
              <Field
                label="Butir Harian"
                required
                icon={Hash}
                fieldKey="dailyPillQuota"
                error={errorFor("dailyPillQuota")}
                fromCard={fromCard("dailyPillQuota")}
                confidence={confidenceFor("dailyPillQuota")}
                wiggleToken={wiggleToken}
                hint="Antara 1–12 butir."
              >
                <input
                  type="number"
                  min={1}
                  max={12}
                  required
                  value={form.dailyPillQuota}
                  onChange={(e) => {
                    markTouched("dailyPillQuota");
                    setForm({
                      ...form,
                      dailyPillQuota: parseInt(e.target.value, 10) || 1,
                    });
                  }}
                  className={`${inputCls} pl-10`}
                />
              </Field>
              <Field
                label="Jam Pengingat"
                required
                icon={Clock}
                fieldKey="reminderTimeLocal"
                error={errorFor("reminderTimeLocal")}
                wiggleToken={wiggleToken}
              >
                <input
                  type="time"
                  required
                  value={form.reminderTimeLocal}
                  onChange={(e) =>
                    setForm({ ...form, reminderTimeLocal: e.target.value })
                  }
                  className={`${inputCls} pl-10`}
                />
              </Field>
              <Field
                label="Tanggal Mulai"
                required
                icon={CalendarDays}
                fieldKey="startDate"
                error={errorFor("startDate")}
                fromCard={fromCard("startDate")}
                confidence={confidenceFor("startDate")}
                wiggleToken={wiggleToken}
              >
                <input
                  type="date"
                  required
                  value={form.startDate}
                  onChange={(e) => {
                    markTouched("startDate");
                    setForm({ ...form, startDate: e.target.value });
                  }}
                  className={`${inputCls} pl-10`}
                />
              </Field>
            </div>

            <div className="mt-5 flex items-start gap-3 rounded-xl border border-tiby-teal-100 bg-tiby-teal-50/50 px-4 py-3">
              <Pill className="mt-0.5 h-4 w-4 shrink-0 text-tiby-teal-700" />
              <p className="text-xs leading-relaxed text-tiby-muted">
                <span className="font-semibold text-tiby-ink">
                  Ringkasan terapi:
                </span>{" "}
                regimen{" "}
                <span className="font-semibold text-tiby-teal-700">
                  {form.regimenCode || "-"}
                </span>
                , {form.dailyPillQuota} butir per hari, pengingat pukul{" "}
                {form.reminderTimeLocal || "-"} ({form.timezone}), mulai{" "}
                {form.startDate ? formatLongDateUtc(form.startDate) : "-"}.
              </p>
            </div>
          </SectionCard>

          <SectionCard
            icon={PhoneCall}
            eyebrow="Opsional"
            title="Kontak Darurat Tambahan"
            description="Dihubungi otomatis oleh sistem jika pasien memerlukan eskalasi darurat."
            aside={
              <div className="flex items-center gap-3 self-start sm:self-auto">
                <span
                  className={`text-xs font-semibold ${
                    includeFamily ? "text-tiby-teal-700" : "text-tiby-muted"
                  }`}
                >
                  {includeFamily ? "Diaktifkan" : "Nonaktif"}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={includeFamily}
                  aria-label="Tambahkan kontak darurat"
                  onClick={() => setIncludeFamily(!includeFamily)}
                  className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tiby-teal-600 ${
                    includeFamily ? "bg-tiby-teal-600" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      includeFamily ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            }
          >
            {includeFamily && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  label="Nama Kontak Darurat"
                  icon={User}
                  fieldKey="familyContact.fullName"
                  error={errorFor("familyContact.fullName")}
                  wiggleToken={wiggleToken}
                >
                  <input
                    type="text"
                    value={form.familyContact?.fullName || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        familyContact: {
                          fullName: e.target.value,
                          whatsappNumber:
                            form.familyContact?.whatsappNumber || "",
                          notifyOnEscalation: true,
                        },
                      })
                    }
                    placeholder="cth: Ibu Kandung"
                    className={`${inputCls} pl-10`}
                  />
                </Field>
                <Field
                  label="Nomor WhatsApp Darurat"
                  icon={Phone}
                  fieldKey="familyContact.whatsappNumber"
                  error={errorFor("familyContact.whatsappNumber")}
                  wiggleToken={wiggleToken}
                >
                  <input
                    type="tel"
                    value={form.familyContact?.whatsappNumber || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        familyContact: {
                          fullName: form.familyContact?.fullName || "",
                          whatsappNumber: e.target.value,
                          notifyOnEscalation: true,
                        },
                      })
                    }
                    placeholder="cth: 08129876543"
                    className={`${inputCls} pl-10`}
                  />
                </Field>
              </div>
            )}
          </SectionCard>

          <div
            className={`${cardCls} flex flex-col-reverse gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6`}
          >
            <p className="flex items-start gap-2 text-xs text-tiby-muted">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-tiby-teal-600" />
              <span>
                Data akan dikonfirmasi sekali lagi sebelum akun diterbitkan.
              </span>
            </p>
            <div className="flex flex-col gap-2 sm:items-end">
              {missing.length > 0 && (
                <p
                  id="onboarding-missing"
                  role="status"
                  className="flex items-start gap-1.5 text-[11px] font-semibold text-red-600 sm:text-right"
                >
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>
                    {missing.length} kolom wajib belum diisi:{" "}
                    {missing
                      .slice(0, 2)
                      .map((field) => field.label)
                      .join(", ")}
                    {missing.length > 2 ? `, dan ${missing.length - 2} lainnya` : ""}.
                  </span>
                </p>
              )}
              <button
                type="submit"
                disabled={submitting || missing.length > 0}
                aria-describedby={missing.length > 0 ? "onboarding-missing" : undefined}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-tiby-teal-600 px-7 py-3 text-sm font-semibold text-white shadow-[0_6px_16px_-6px_rgba(13,148,136,0.6)] transition hover:-translate-y-0.5 hover:bg-tiby-teal-700 hover:shadow-[0_10px_20px_-8px_rgba(13,148,136,0.7)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tiby-teal-600 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
              >
                <Send className="h-4 w-4" />
                <span>Simpan &amp; Terbitkan Akun</span>
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
