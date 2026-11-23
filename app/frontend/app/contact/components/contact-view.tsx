"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Clock,
  Copy,
  ExternalLink,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
} from "lucide-react";
import Mascot from "@/components/mascot";
import { buildContactMailtoUrl, CONTACT_INFO } from "@/lib/contact";
import { notify } from "@/lib/toast";

type FieldName =
  "name" | "facility" | "email" | "phone" | "subject" | "message";

type FormValues = Record<FieldName, string>;

const INITIAL_VALUES: FormValues = {
  name: "",
  facility: "",
  email: "",
  phone: "",
  subject: "",
  message: "",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FIELD_ORDER: FieldName[] = [
  "name",
  "facility",
  "email",
  "phone",
  "subject",
  "message",
];

function validateField(field: FieldName, raw: string): string | undefined {
  const value = raw.trim();
  switch (field) {
    case "name":
      return value ? undefined : "Masukkan nama lengkap Anda.";
    case "facility":
      return value ? undefined : "Masukkan nama Faskes atau instansi Anda.";
    case "email":
      if (!value) return "Masukkan alamat email Anda.";
      return EMAIL_PATTERN.test(value)
        ? undefined
        : "Masukkan alamat email yang valid, misalnya nama@faskes.go.id.";
    case "phone": {
      if (!value) return undefined;
      const digits = value.replace(/\D/g, "");
      return digits.length >= 8
        ? undefined
        : "Masukkan nomor telepon/WhatsApp yang valid (minimal 8 digit).";
    }
    case "subject":
      return value ? undefined : "Masukkan subjek pesan.";
    case "message":
      return value
        ? undefined
        : "Tuliskan kebutuhan atau pertanyaan Faskes Anda.";
  }
}

export default function ContactView() {
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
  const [dirty, setDirty] = useState<Partial<Record<FieldName, boolean>>>({});
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [liveError, setLiveError] = useState("");
  const [copiedField, setCopiedField] = useState<"email" | "phone" | null>(
    null,
  );
  const [submittedMailto, setSubmittedMailto] = useState<string | null>(null);

  const handleChange = (field: FieldName, nextValue: string) => {
    setValues((prev) => ({ ...prev, [field]: nextValue }));
    setDirty((prev) => ({ ...prev, [field]: true }));

    // Only clear an active error while typing; avoid premature errors mid-input.
    if (errors[field]) {
      const nextErr = validateField(field, nextValue);
      if (!nextErr) {
        setErrors((prev) => {
          const updated = { ...prev };
          delete updated[field];
          return updated;
        });
        setLiveError("");
      }
    }
  };

  const handleBlur = (field: FieldName) => {
    if (!dirty[field] && !errors[field]) return;
    const err = validateField(field, values[field]);
    setErrors((prev) => {
      const next = { ...prev };
      if (err) {
        next[field] = err;
      } else {
        delete next[field];
      }
      return next;
    });
    if (err) {
      setLiveError(err);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const nextErrors: Partial<Record<FieldName, string>> = {};
    let firstInvalid: FieldName | null = null;

    for (const field of FIELD_ORDER) {
      const err = validateField(field, values[field]);
      if (err) {
        nextErrors[field] = err;
        if (!firstInvalid) firstInvalid = field;
      }
    }

    setErrors(nextErrors);

    if (firstInvalid) {
      setLiveError(
        nextErrors[firstInvalid] ?? "Periksa kembali isian formulir.",
      );
      const control = e.currentTarget.elements.namedItem(firstInvalid);
      if (control instanceof HTMLElement) {
        control.focus();
      }
      return;
    }

    setLiveError("");
    const mailtoUrl = buildContactMailtoUrl({
      name: values.name,
      facility: values.facility,
      email: values.email,
      phone: values.phone,
      subject: values.subject,
      message: values.message,
    });

    setSubmittedMailto(mailtoUrl);
    notify.success(
      "Mengarahkan ke Email",
      `Pesan disiapkan untuk ${CONTACT_INFO.adminEmail}.`,
    );
    window.location.href = mailtoUrl;
  };

  const copyText = async (target: "email" | "phone", value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(target);
      notify.success("Tersalin", `${value} disalin ke papan klip.`);
      window.setTimeout(() => {
        setCopiedField((curr) => (curr === target ? null : curr));
      }, 2000);
    } catch {
      notify.error("Gagal Menyalin", "Salin informasi kontak secara manual.");
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-medium text-tiby-ink shadow-xs ring-1 ring-gray-200 transition-colors hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Login
        </Link>
        <Link
          href="/"
          className="text-sm font-semibold text-tiby-muted transition-colors hover:text-tiby-teal-700"
        >
          Beranda
        </Link>
      </div>

      <header className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-tiby-teal-50 ring-1 ring-tiby-teal-100">
          <Mascot emotion="happy" size={50} altText="Pandu" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-tiby-teal-700">
            Layanan Faskes &amp; Mitra
          </p>
          <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight text-tiby-ink">
            Hubungi Admin Tiby
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-tiby-muted">
            Faskes Anda ingin menggunakan Tiby, mendaftarkan akun Nakes, atau
            membutuhkan bantuan teknis? Hubungi admin kami melalui kontak resmi
            atau kirim pesan di bawah ini.
          </p>
        </div>
      </header>

      <div className="mt-8 flex flex-col">
        {/* Formulir Pengiriman Email */}
        <section
          aria-labelledby="contact-form-heading"
          className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs sm:p-8 lg:col-span-3"
        >
          <h2
            id="contact-form-heading"
            className="font-heading text-lg font-bold text-tiby-ink"
          >
            Kirim Pesan ke Admin
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-tiby-muted">
            Setelah dikirim, aplikasi email Anda akan terbuka otomatis dengan
            tujuan{" "}
            <span className="font-semibold text-tiby-ink">
              {CONTACT_INFO.adminEmail}
            </span>
            .
          </p>

          <div aria-live="polite" className="sr-only">
            {liveError}
          </div>

          <form
            noValidate
            onSubmit={handleSubmit}
            aria-labelledby="contact-form-heading"
            className="mt-6 space-y-5"
          >
            {/* Nama Lengkap */}
            <div className="space-y-1.5">
              <label
                htmlFor="contact-name"
                className="block text-xs font-semibold text-tiby-ink"
              >
                Nama Lengkap <span aria-hidden="true">*</span>
              </label>
              <input
                id="contact-name"
                name="name"
                type="text"
                autoComplete="name"
                enterKeyHint="next"
                required
                aria-invalid={errors.name ? "true" : "false"}
                aria-describedby={
                  errors.name ? "contact-name-error" : undefined
                }
                value={values.name}
                onChange={(e) => handleChange("name", e.target.value)}
                onBlur={() => handleBlur("name")}
                placeholder="dr. Rini Suryani"
                className={`min-h-12 w-full rounded-xl border bg-gray-50 px-4 py-3 text-base sm:text-sm text-tiby-ink placeholder:text-gray-400 transition-all focus:bg-white focus:outline-none focus:ring-4 ${
                  errors.name
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                    : "border-gray-200 focus:border-tiby-teal-600 focus:ring-tiby-teal-600/10"
                }`}
              />
              {errors.name && (
                <p
                  id="contact-name-error"
                  className="flex items-center gap-1.5 text-xs font-medium text-red-600"
                >
                  <AlertCircle
                    aria-hidden="true"
                    className="h-3.5 w-3.5 shrink-0"
                  />
                  <span>{errors.name}</span>
                </p>
              )}
            </div>

            {/* Nama Faskes / Instansi */}
            <div className="space-y-1.5">
              <label
                htmlFor="contact-facility"
                className="block text-xs font-semibold text-tiby-ink"
              >
                Nama Faskes / Instansi <span aria-hidden="true">*</span>
              </label>
              <input
                id="contact-facility"
                name="facility"
                type="text"
                autoComplete="organization"
                enterKeyHint="next"
                required
                aria-invalid={errors.facility ? "true" : "false"}
                aria-describedby={
                  errors.facility ? "contact-facility-error" : undefined
                }
                value={values.facility}
                onChange={(e) => handleChange("facility", e.target.value)}
                onBlur={() => handleBlur("facility")}
                placeholder="Puskesmas Melati / RS Harapan"
                className={`min-h-12 w-full rounded-xl border bg-gray-50 px-4 py-3 text-base sm:text-sm text-tiby-ink placeholder:text-gray-400 transition-all focus:bg-white focus:outline-none focus:ring-4 ${
                  errors.facility
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                    : "border-gray-200 focus:border-tiby-teal-600 focus:ring-tiby-teal-600/10"
                }`}
              />
              {errors.facility && (
                <p
                  id="contact-facility-error"
                  className="flex items-center gap-1.5 text-xs font-medium text-red-600"
                >
                  <AlertCircle
                    aria-hidden="true"
                    className="h-3.5 w-3.5 shrink-0"
                  />
                  <span>{errors.facility}</span>
                </p>
              )}
            </div>

            {/* Email (1 input email) */}
            <div className="space-y-1.5">
              <label
                htmlFor="contact-email"
                className="block text-xs font-semibold text-tiby-ink"
              >
                Email Anda <span aria-hidden="true">*</span>
              </label>
              <input
                id="contact-email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                enterKeyHint="next"
                required
                aria-invalid={errors.email ? "true" : "false"}
                aria-describedby={
                  errors.email ? "contact-email-error" : undefined
                }
                value={values.email}
                onChange={(e) => handleChange("email", e.target.value)}
                onBlur={() => handleBlur("email")}
                placeholder="nama@faskes.go.id"
                className={`min-h-12 w-full rounded-xl border bg-gray-50 px-4 py-3 text-base sm:text-sm text-tiby-ink placeholder:text-gray-400 transition-all focus:bg-white focus:outline-none focus:ring-4 ${
                  errors.email
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                    : "border-gray-200 focus:border-tiby-teal-600 focus:ring-tiby-teal-600/10"
                }`}
              />
              {errors.email && (
                <p
                  id="contact-email-error"
                  className="flex items-center gap-1.5 text-xs font-medium text-red-600"
                >
                  <AlertCircle
                    aria-hidden="true"
                    className="h-3.5 w-3.5 shrink-0"
                  />
                  <span>{errors.email}</span>
                </p>
              )}
            </div>

            {/* Nomor WhatsApp / Telepon (opsional) */}
            <div className="space-y-1.5">
              <label
                htmlFor="contact-phone"
                className="block text-xs font-semibold text-tiby-ink"
              >
                Nomor WhatsApp / Telepon{" "}
                <span className="font-normal text-tiby-muted">(opsional)</span>
              </label>
              <input
                id="contact-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                enterKeyHint="next"
                aria-invalid={errors.phone ? "true" : "false"}
                aria-describedby={
                  errors.phone ? "contact-phone-error" : undefined
                }
                value={values.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                onBlur={() => handleBlur("phone")}
                placeholder="08xxxxxxxxxx"
                className={`min-h-12 w-full rounded-xl border bg-gray-50 px-4 py-3 text-base sm:text-sm text-tiby-ink placeholder:text-gray-400 transition-all focus:bg-white focus:outline-none focus:ring-4 ${
                  errors.phone
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                    : "border-gray-200 focus:border-tiby-teal-600 focus:ring-tiby-teal-600/10"
                }`}
              />
              {errors.phone && (
                <p
                  id="contact-phone-error"
                  className="flex items-center gap-1.5 text-xs font-medium text-red-600"
                >
                  <AlertCircle
                    aria-hidden="true"
                    className="h-3.5 w-3.5 shrink-0"
                  />
                  <span>{errors.phone}</span>
                </p>
              )}
            </div>

            {/* Subjek */}
            <div className="space-y-1.5">
              <label
                htmlFor="contact-subject"
                className="block text-xs font-semibold text-tiby-ink"
              >
                Subjek <span aria-hidden="true">*</span>
              </label>
              <input
                id="contact-subject"
                name="subject"
                type="text"
                enterKeyHint="next"
                required
                aria-invalid={errors.subject ? "true" : "false"}
                aria-describedby={
                  errors.subject ? "contact-subject-error" : undefined
                }
                value={values.subject}
                onChange={(e) => handleChange("subject", e.target.value)}
                onBlur={() => handleBlur("subject")}
                placeholder="Permintaan aktivasi layanan Tiby untuk Puskesmas"
                className={`min-h-12 w-full rounded-xl border bg-gray-50 px-4 py-3 text-base sm:text-sm text-tiby-ink placeholder:text-gray-400 transition-all focus:bg-white focus:outline-none focus:ring-4 ${
                  errors.subject
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                    : "border-gray-200 focus:border-tiby-teal-600 focus:ring-tiby-teal-600/10"
                }`}
              />
              {errors.subject && (
                <p
                  id="contact-subject-error"
                  className="flex items-center gap-1.5 text-xs font-medium text-red-600"
                >
                  <AlertCircle
                    aria-hidden="true"
                    className="h-3.5 w-3.5 shrink-0"
                  />
                  <span>{errors.subject}</span>
                </p>
              )}
            </div>

            {/* Pesan */}
            <div className="space-y-1.5">
              <label
                htmlFor="contact-message"
                className="block text-xs font-semibold text-tiby-ink"
              >
                Pesan <span aria-hidden="true">*</span>
              </label>
              <textarea
                id="contact-message"
                name="message"
                rows={4}
                required
                aria-invalid={errors.message ? "true" : "false"}
                aria-describedby={
                  errors.message ? "contact-message-error" : undefined
                }
                value={values.message}
                onChange={(e) => handleChange("message", e.target.value)}
                onBlur={() => handleBlur("message")}
                placeholder="Ceritakan jumlah Nakes/pasien atau layanan yang dibutuhkan Faskes Anda..."
                className={`w-full resize-y rounded-xl border bg-gray-50 px-4 py-3 text-base sm:text-sm text-tiby-ink placeholder:text-gray-400 transition-all focus:bg-white focus:outline-none focus:ring-4 ${
                  errors.message
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                    : "border-gray-200 focus:border-tiby-teal-600 focus:ring-tiby-teal-600/10"
                }`}
              />
              {errors.message && (
                <p
                  id="contact-message-error"
                  className="flex items-center gap-1.5 text-xs font-medium text-red-600"
                >
                  <AlertCircle
                    aria-hidden="true"
                    className="h-3.5 w-3.5 shrink-0"
                  />
                  <span>{errors.message}</span>
                </p>
              )}
            </div>

            {/* Informasi Kontak */}
            <section
              aria-labelledby="contact-info-heading"
              className="space-y-4 lg:col-span-2"
            >
              <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs">
                <h2
                  id="contact-info-heading"
                  className="font-heading text-lg font-bold text-tiby-ink"
                >
                  Informasi Kontak
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-tiby-muted">
                  Saluran komunikasi resmi admin Tiby untuk aktivasi Faskes dan
                  dukungan operasional.
                </p>

                <div className="mt-5 space-y-3">
                  {/* Email Admin */}
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-tiby-teal-100 text-tiby-teal-700">
                          <Mail className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-tiby-muted">
                            Email Admin
                          </p>
                          <a
                            href={`mailto:${CONTACT_INFO.adminEmail}`}
                            className="mt-0.5 block break-all text-sm font-semibold text-tiby-ink underline-offset-4 hover:text-tiby-teal-700 hover:underline"
                          >
                            {CONTACT_INFO.adminEmail}
                          </a>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          void copyText("email", CONTACT_INFO.adminEmail)
                        }
                        aria-label="Salin alamat email admin"
                        className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-tiby-teal-700 ring-1 ring-gray-200 transition-colors hover:bg-tiby-teal-50"
                      >
                        {copiedField === "email" ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        {copiedField === "email" ? "Tersalin" : "Salin"}
                      </button>
                    </div>
                  </div>

                  {/* Telepon / WhatsApp Admin */}
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-tiby-teal-100 text-tiby-teal-700">
                          <Phone className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-tiby-muted">
                            Telepon / WhatsApp
                          </p>
                          <a
                            href={CONTACT_INFO.phoneHref}
                            className="mt-0.5 block text-sm font-semibold text-tiby-ink underline-offset-4 hover:text-tiby-teal-700 hover:underline"
                          >
                            {CONTACT_INFO.phoneDisplay}
                          </a>
                          <a
                            href={CONTACT_INFO.whatsappHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-tiby-teal-700 hover:underline"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            Chat via WhatsApp
                          </a>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          void copyText("phone", CONTACT_INFO.phoneDisplay)
                        }
                        aria-label="Salin nomor telepon admin"
                        className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-tiby-teal-700 ring-1 ring-gray-200 transition-colors hover:bg-tiby-teal-50"
                      >
                        {copiedField === "phone" ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        {copiedField === "phone" ? "Tersalin" : "Salin"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <button
              type="submit"
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-tiby-teal-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-tiby-teal-600/20 transition-all hover:-translate-y-0.5 hover:bg-tiby-teal-700 hover:shadow-xl cursor-pointer"
            >
              <Send className="h-4 w-4" />
              Kirim Email ke Admin
            </button>
          </form>

          {submittedMailto && (
            <div
              role="status"
              className="mt-5 space-y-2.5 rounded-2xl border border-tiby-teal-200 bg-tiby-teal-50/70 p-4"
            >
              <p className="text-xs font-semibold text-tiby-ink">
                Aplikasi email tidak terbuka otomatis?
              </p>
              <p className="text-xs leading-relaxed text-tiby-muted">
                Klik tautan di bawah untuk membuka draf email ke{" "}
                <span className="font-semibold text-tiby-ink">
                  {CONTACT_INFO.adminEmail}
                </span>
                , atau salin alamat email admin.
              </p>
              <div className="flex flex-wrap gap-2">
                <a
                  href={submittedMailto}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-tiby-teal-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-tiby-teal-700"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Buka Aplikasi Email
                </a>
                <button
                  type="button"
                  onClick={() =>
                    void copyText("email", CONTACT_INFO.adminEmail)
                  }
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-tiby-ink transition-colors hover:bg-gray-50"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Salin Email Admin
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
