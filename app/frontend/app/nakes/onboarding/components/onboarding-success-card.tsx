"use client";

import { useState } from "react";
import { usePopup } from "@/components/ui/popup-provider";
import type { OnboardingCredentials } from "@tiby/ts-shared";
import {
  Check,
  Copy,
  ExternalLink,
  UserPlus,
  ShieldCheck,
  KeyRound,
  User,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface OnboardingSuccessCardProps {
  credentials: OnboardingCredentials;
  onReset: () => void;
}

/* ────────────────────────────────────────────────────────────────
   Presentational helpers (di luar komponen utama)
   ──────────────────────────────────────────────────────────────── */

function CredentialCard({
  icon: Icon,
  role,
  caption,
  username,
  password,
  copyLabel,
  copied,
  onCopy,
  onOpenLogin,
}: {
  icon: LucideIcon;
  role: string;
  caption: string;
  username: string;
  password: string;
  copyLabel: string;
  copied: boolean;
  onCopy: () => void;
  onOpenLogin: () => void;
}) {
  return (
    <article className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      {/* Header kartu */}
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tiby-teal-50 text-tiby-teal-700 ring-1 ring-tiby-teal-100">
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0">
          <h4 className="font-heading text-sm font-semibold leading-tight text-tiby-ink">
            {role}
          </h4>
          <p className="text-[11px] text-tiby-muted">{caption}</p>
        </div>
      </div>

      {/* Detail login */}
      <dl className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-gray-50/60">
        <div className="flex items-center justify-between gap-3 px-3.5 py-3">
          <dt className="flex shrink-0 items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-tiby-muted">
            <User className="h-3.5 w-3.5" />
            Username
          </dt>
          <dd className="min-w-0 truncate font-mono text-[13px] font-semibold text-tiby-ink select-all">
            {username}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3 px-3.5 py-3">
          <dt className="flex shrink-0 items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-tiby-muted">
            <KeyRound className="h-3.5 w-3.5" />
            Password
          </dt>
          <dd className="min-w-0 truncate rounded-md bg-tiby-teal-50 px-2 py-0.5 font-mono text-[13px] font-semibold text-tiby-teal-700 select-all">
            {password}
          </dd>
        </div>
      </dl>

      {/* Aksi */}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onCopy}
          aria-live="polite"
          className={`inline-flex min-w-[9.5rem] flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tiby-teal-600 ${
            copied
              ? "bg-emerald-600 hover:bg-emerald-600"
              : "bg-tiby-teal-600 hover:bg-tiby-teal-700"
          }`}
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" strokeWidth={2.5} />
              <span>Tersalin</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              <span>{copyLabel}</span>
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onOpenLogin}
          className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-tiby-ink transition hover:border-tiby-teal-200 hover:bg-tiby-teal-50/60 hover:text-tiby-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tiby-teal-600"
        >
          <span>Buka Halaman Login</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  );
}

/* ──────────────────────────── Komponen utama ──────────────────────────── */

export default function OnboardingSuccessCard({
  credentials,
  onReset,
}: OnboardingSuccessCardProps) {
  const { confirm, notify } = usePopup();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = async (text: string, key: "patient" | "pmo") => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);

    await notify({
      variant: "success",
      badgeText: "Kredensial Tersalin",
      title:
        key === "patient"
          ? "Akun Pasien Berhasil Disalin"
          : "Akun PMO Berhasil Disalin",
      description:
        "Silakan tempel (paste) dan kirimkan informasi login sementara ini melalui WhatsApp kepada yang bersangkutan.",
      confirmLabel: "Siap",
    });
  };

  const handleConfirmReset = async () => {
    const ok = await confirm({
      variant: "warning",
      badgeText: "Perhatian Kredensial",
      title: "Sudah Menyalin Password Sementara?",
      description:
        "Setelah halaman ini ditutup untuk mendaftarkan pasien baru, password sementara Pasien dan PMO tidak akan ditampilkan kembali.",
      confirmLabel: "Sudah Disalin, Lanjutkan",
      cancelLabel: "Kembali Salin",
    });

    if (ok) {
      onReset();
    }
  };

  return (
    <section
      aria-label="Kredensial akun yang berhasil dibuat"
      className="animate-fadeIn overflow-hidden rounded-2xl border border-tiby-teal-100 bg-white shadow-[0_1px_3px_rgba(16,24,40,0.05)]"
    >
      {/* ───────── Header status ───────── */}
      <header className="flex flex-col gap-4 border-b border-tiby-teal-100/70 bg-tiby-teal-50/60 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm ring-4 ring-emerald-100">
            <Check className="h-6 w-6" strokeWidth={3} />
          </span>
          <div>
            <h3 className="font-heading text-lg font-semibold leading-tight text-tiby-ink">
              Onboarding Pasien Berhasil Terbit
            </h3>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-tiby-muted">
              Simpan atau salin kredensial login sementara berikut untuk
              diberikan kepada Pasien dan PMO. Password dapat diubah secara
              mandiri setelah login pertama.
            </p>
          </div>
        </div>

        <div className="shrink-0 rounded-xl border border-tiby-teal-100 bg-white px-3.5 py-2.5 sm:max-w-[15rem]">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-tiby-muted">
            ID Rencana Terapi
          </p>
          <p className="mt-0.5 break-all font-mono text-[11px] font-semibold text-tiby-ink select-all">
            {credentials.treatmentPlanId}
          </p>
        </div>
      </header>

      {/* ───────── Isi ───────── */}
      <div className="space-y-5 px-5 py-6 sm:px-7">
        {/* Catatan penting */}
        <div
          role="note"
          className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
        >
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-xs leading-relaxed text-amber-900">
            <span className="font-semibold">Password bersifat sementara.</span>{" "}
            Informasi ini hanya ditampilkan di halaman ini dan tidak akan muncul
            kembali setelah Anda mendaftarkan pasien baru, jadi pastikan sudah
            disalin.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CredentialCard
            icon={User}
            role="Akun Pasien"
            caption="Untuk masuk ke aplikasi sebagai pasien"
            username={credentials.patientUsername}
            password={credentials.patientPassword}
            copyLabel="Salin Akun Pasien"
            copied={copiedKey === "patient"}
            onCopy={() =>
              copyToClipboard(
                `Akun Tiby Pasien:\nUsername: ${credentials.patientUsername}\nPassword: ${credentials.patientPassword}`,
                "patient",
              )
            }
            onOpenLogin={() => {
              const loginUrl = `/login?prefill=${encodeURIComponent(credentials.patientUsername)}`;
              window.open(loginUrl, "_blank");
            }}
          />

          <CredentialCard
            icon={Users}
            role="Akun PMO (Pengawas)"
            caption="Untuk memantau kepatuhan minum obat"
            username={credentials.pmoUsername}
            password={credentials.pmoPassword}
            copyLabel="Salin Akun PMO"
            copied={copiedKey === "pmo"}
            onCopy={() =>
              copyToClipboard(
                `Akun Tiby PMO:\nUsername: ${credentials.pmoUsername}\nPassword: ${credentials.pmoPassword}`,
                "pmo",
              )
            }
            onOpenLogin={() => {
              const loginUrl = `/login?prefill=${encodeURIComponent(credentials.pmoUsername)}`;
              window.open(loginUrl, "_blank");
            }}
          />
        </div>
      </div>

      {/* ───────── Footer aksi ───────── */}
      <footer className="flex flex-col gap-3 border-t border-tiby-teal-100/70 bg-gray-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <p className="text-xs text-tiby-muted">
          Sudah selesai? Lanjutkan dengan pasien berikutnya.
        </p>
        <button
          type="button"
          onClick={handleConfirmReset}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-tiby-teal-600 px-6 py-2.5 text-xs font-semibold text-white shadow-[0_6px_16px_-6px_rgba(13,148,136,0.6)] transition hover:-translate-y-0.5 hover:bg-tiby-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tiby-teal-600"
        >
          <UserPlus className="h-4 w-4" />
          <span>Daftarkan Pasien Baru Lainnya</span>
        </button>
      </footer>
    </section>
  );
}
