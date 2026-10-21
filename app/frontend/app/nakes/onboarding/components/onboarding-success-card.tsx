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
} from "lucide-react";

interface OnboardingSuccessCardProps {
  credentials: OnboardingCredentials;
  onReset: () => void;
}

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
    <div className="rounded-3xl border border-teal-200 bg-tiby-teal-50/70 p-6 shadow-sm animate-fadeIn">
      <div className="flex items-center gap-2.5 mb-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-tiby-teal-600 text-white shadow-2xs">
          <ShieldCheck className="w-4 h-4" />
        </span>
        <h3 className="font-heading text-lg font-600 text-tiby-teal-700">
          Onboarding Pasien Berhasil Terbit
        </h3>
      </div>
      <p className="text-xs text-tiby-muted leading-relaxed mb-5">
        Simpan atau salin kredensial login sementara berikut untuk diberikan
        kepada Pasien dan PMO. Password dapat diubah secara mandiri setelah
        login pertama.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        {/* Patient Creds */}
        <div className="rounded-2xl border border-tiby-teal-100 bg-white p-4 text-xs shadow-2xs">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[10px] font-bold text-tiby-teal-700 uppercase tracking-wider">
              Akun Pasien
            </span>
            <KeyRound className="w-3.5 h-3.5 text-tiby-teal-600" />
          </div>
          <p className="text-tiby-ink">
            Username:{" "}
            <strong className="font-mono">{credentials.patientUsername}</strong>
          </p>
          <p className="text-tiby-ink mt-1">
            Password:{" "}
            <strong className="font-mono text-tiby-teal-700">
              {credentials.patientPassword}
            </strong>
          </p>
          <div className="mt-3.5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                copyToClipboard(
                  `Akun Tiby Pasien:\nUsername: ${credentials.patientUsername}\nPassword: ${credentials.patientPassword}`,
                  "patient",
                )
              }
              className="inline-flex items-center gap-1.5 rounded-full border border-tiby-teal-100 px-3 py-1.5 text-[11px] font-semibold text-tiby-teal-700 hover:bg-tiby-teal-50 transition cursor-pointer"
            >
              {copiedKey === "patient" ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-600" />
                  <span>Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin Akun Pasien</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                const loginUrl = `/login?prefill=${encodeURIComponent(credentials.patientUsername)}`;
                window.open(loginUrl, "_blank");
              }}
              className="inline-flex items-center gap-1 rounded-full border border-tiby-teal-100 px-3 py-1.5 text-[11px] font-semibold text-tiby-teal-700 hover:bg-tiby-teal-50 transition cursor-pointer"
            >
              <span>Buka Halaman Login</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* PMO Creds */}
        <div className="rounded-2xl border border-tiby-teal-100 bg-white p-4 text-xs shadow-2xs">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[10px] font-bold text-tiby-teal-700 uppercase tracking-wider">
              Akun PMO (Pengawas)
            </span>
            <KeyRound className="w-3.5 h-3.5 text-tiby-teal-600" />
          </div>
          <p className="text-tiby-ink">
            Username:{" "}
            <strong className="font-mono">{credentials.pmoUsername}</strong>
          </p>
          <p className="text-tiby-ink mt-1">
            Password:{" "}
            <strong className="font-mono text-tiby-teal-700">
              {credentials.pmoPassword}
            </strong>
          </p>
          <div className="mt-3.5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                copyToClipboard(
                  `Akun Tiby PMO:\nUsername: ${credentials.pmoUsername}\nPassword: ${credentials.pmoPassword}`,
                  "pmo",
                )
              }
              className="inline-flex items-center gap-1.5 rounded-full border border-tiby-teal-100 px-3 py-1.5 text-[11px] font-semibold text-tiby-teal-700 hover:bg-tiby-teal-50 transition cursor-pointer"
            >
              {copiedKey === "pmo" ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-600" />
                  <span>Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin Akun PMO</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                const loginUrl = `/login?prefill=${encodeURIComponent(credentials.pmoUsername)}`;
                window.open(loginUrl, "_blank");
              }}
              className="inline-flex items-center gap-1 rounded-full border border-tiby-teal-100 px-3 py-1.5 text-[11px] font-semibold text-tiby-teal-700 hover:bg-tiby-teal-50 transition cursor-pointer"
            >
              <span>Buka Halaman Login</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-tiby-teal-100 bg-white px-4 py-2.5 mb-5">
        <p className="text-[11px] text-tiby-muted">
          ID Rencana Terapi:{" "}
          <span className="font-mono text-tiby-ink font-semibold">
            {credentials.treatmentPlanId}
          </span>
        </p>
      </div>

      <button
        type="button"
        onClick={handleConfirmReset}
        className="inline-flex items-center gap-2 rounded-full bg-tiby-teal-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-tiby-teal-700 transition shadow-xs cursor-pointer"
      >
        <UserPlus className="w-4 h-4" />
        <span>Daftarkan Pasien Baru Lainnya</span>
      </button>
    </div>
  );
}
