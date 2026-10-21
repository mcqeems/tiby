"use client";

import { useState } from "react";
import type { OnboardingCredentials } from "@tiby/ts-shared";

interface OnboardingSuccessCardProps {
  credentials: OnboardingCredentials;
  onReset: () => void;
}

export default function OnboardingSuccessCard({
  credentials,
  onReset,
}: OnboardingSuccessCardProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="rounded-3xl border border-teal-200 bg-tiby-teal-50/70 p-6 shadow-sm animate-fadeIn">
      <div className="flex items-center gap-2 mb-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-tiby-teal-600 text-white text-xs">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
            className="w-3.5 h-3.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </svg>
        </span>
        <h3 className="font-heading text-lg font-600 text-tiby-teal-700">
          Onboarding Pasien Berhasil Terbit!
        </h3>
      </div>
      <p className="text-xs text-tiby-muted leading-relaxed mb-4">
        Simpan atau salin kredensial login sementara berikut untuk diberikan
        kepada Pasien dan PMO. Password dapat diubah setelah login pertama.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {/* Patient Creds */}
        <div className="rounded-2xl border border-tiby-teal-100 bg-white p-4 text-xs shadow-2xs">
          <span className="text-[10px] font-bold text-tiby-teal-700 uppercase tracking-wider block mb-2">
            Akun Pasien
          </span>
          <p className="text-tiby-ink">
            Username:{" "}
            <strong className="font-mono">{credentials.patientUsername}</strong>
          </p>
          <p className="text-tiby-ink mt-0.5">
            Password:{" "}
            <strong className="font-mono text-tiby-teal-700">
              {credentials.patientPassword}
            </strong>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                copyToClipboard(
                  `Akun Tiby Pasien:\nUsername: ${credentials.patientUsername}\nPassword: ${credentials.patientPassword}`,
                  "patient",
                )
              }
              className="rounded-full border border-tiby-teal-100 px-3 py-1 text-[11px] font-semibold text-tiby-teal-700 hover:bg-tiby-teal-50 transition cursor-pointer"
            >
              {copiedKey === "patient" ? "Tersalin" : "Salin Akun Pasien"}
            </button>
            <button
              type="button"
              onClick={() => {
                const loginUrl = `/login?prefill=${encodeURIComponent(credentials.patientUsername)}`;
                window.open(loginUrl, "_blank");
              }}
              className="rounded-full border border-tiby-teal-100 px-3 py-1 text-[11px] font-semibold text-tiby-teal-700 hover:bg-tiby-teal-50 transition cursor-pointer"
            >
              Buka Halaman Login ↗
            </button>
          </div>
        </div>

        {/* PMO Creds */}
        <div className="rounded-2xl border border-tiby-teal-100 bg-white p-4 text-xs shadow-2xs">
          <span className="text-[10px] font-bold text-tiby-teal-700 uppercase tracking-wider block mb-2">
            Akun PMO (Pengawas)
          </span>
          <p className="text-tiby-ink">
            Username:{" "}
            <strong className="font-mono">{credentials.pmoUsername}</strong>
          </p>
          <p className="text-tiby-ink mt-0.5">
            Password:{" "}
            <strong className="font-mono text-tiby-teal-700">
              {credentials.pmoPassword}
            </strong>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                copyToClipboard(
                  `Akun Tiby PMO:\nUsername: ${credentials.pmoUsername}\nPassword: ${credentials.pmoPassword}`,
                  "pmo",
                )
              }
              className="rounded-full border border-tiby-teal-100 px-3 py-1 text-[11px] font-semibold text-tiby-teal-700 hover:bg-tiby-teal-50 transition cursor-pointer"
            >
              {copiedKey === "pmo" ? "Tersalin" : "Salin Akun PMO"}
            </button>
            <button
              type="button"
              onClick={() => {
                const loginUrl = `/login?prefill=${encodeURIComponent(credentials.pmoUsername)}`;
                window.open(loginUrl, "_blank");
              }}
              className="rounded-full border border-tiby-teal-100 px-3 py-1 text-[11px] font-semibold text-tiby-teal-700 hover:bg-tiby-teal-50 transition cursor-pointer"
            >
              Buka Halaman Login ↗
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-tiby-teal-100 bg-white px-4 py-2.5 mb-4">
        <p className="text-[11px] text-tiby-muted">
          ID Rencana Terapi:{" "}
          <span className="font-mono text-tiby-ink font-semibold">
            {credentials.treatmentPlanId}
          </span>
        </p>
      </div>

      <button
        type="button"
        onClick={onReset}
        className="rounded-full bg-tiby-teal-600 px-5 py-2 text-xs font-semibold text-white hover:bg-tiby-teal-700 transition cursor-pointer"
      >
        + Daftarkan Pasien Baru Lainnya
      </button>
    </div>
  );
}
