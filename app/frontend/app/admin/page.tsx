"use client";

import { useState } from "react";
import { useSession } from "@/lib/auth-client";
import { handleSignOut } from "../role-guard";
import type { TibyUser } from "@/lib/auth-client";
import OnboardingForm from "@/components/onboarding-form";

export default function AdminPage() {
  const { data: sessionData, isPending } = useSession();
  const user = sessionData?.user as TibyUser | undefined;

  const [activeTab, setActiveTab] = useState<"overview" | "onboarding">("overview");

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-tiby-white text-tiby-muted font-body">
        Memuat dashboard admin...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-tiby-white text-tiby-ink font-body selection:bg-tiby-teal-100 selection:text-tiby-teal-700">
      {/* DESKTOP SIDEBAR (250px) */}
      <aside
        aria-label="Sidebar Admin"
        className="hidden md:flex w-[250px] shrink-0 flex-col justify-between border-r border-tiby-teal-100 bg-white p-6 shadow-xs"
      >
        <div className="space-y-6">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-tiby-teal-600 text-white font-heading font-600 text-lg shadow-sm">
              T
            </span>
            <div>
              <span className="font-heading text-lg font-600 text-tiby-ink tracking-tight block leading-tight">
                Tiby Admin
              </span>
              <span className="text-[10px] text-tiby-muted uppercase tracking-wider font-semibold">
                Pusat Kontrol
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav aria-label="Navigasi Menu Admin" className="space-y-1.5">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition cursor-pointer ${
                activeTab === "overview"
                  ? "bg-tiby-teal-50 text-tiby-teal-700"
                  : "text-tiby-muted hover:bg-gray-50 hover:text-tiby-ink"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.25 2.25L15 6"
                />
              </svg>
              <span>Ringkasan Nasional</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("onboarding")}
              className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition cursor-pointer ${
                activeTab === "onboarding"
                  ? "bg-tiby-teal-50 text-tiby-teal-700"
                  : "text-tiby-muted hover:bg-gray-50 hover:text-tiby-ink"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              <span>Onboarding Pasien Baru</span>
            </button>
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="border-t border-tiby-teal-100 pt-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-tiby-teal-50 text-tiby-teal-700 font-bold text-xs">
              {user?.name?.[0] || user?.username?.[0] || "A"}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-tiby-ink truncate">
                {user?.name || user?.username}
              </p>
              <p className="text-[11px] text-tiby-muted truncate">Administrator</p>
            </div>
          </div>
          <button
            onClick={() => handleSignOut()}
            className="w-full rounded-xl border border-red-200 bg-white py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 cursor-pointer"
          >
            Keluar
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        {activeTab === "onboarding" ? (
          <div className="max-w-4xl">
            <div className="mb-6">
              <span className="text-[10px] font-bold text-tiby-teal-600 uppercase tracking-wider block mb-0.5">
                Registrasi Pasien
              </span>
              <h1 className="font-heading text-2xl font-600 text-tiby-ink">
                Onboarding Pasien Baru &amp; Rencana Terapi
              </h1>
              <p className="mt-1 text-xs text-tiby-muted">
                Daftarkan pasien dan terbitkan rencana terapi obat secara mandiri atau dengan bantuan OCR kartu pengobatan.
              </p>
            </div>
            <OnboardingForm onSuccess={() => setActiveTab("overview")} />
          </div>
        ) : (
          <div className="max-w-5xl">
            {/* Top Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-tiby-teal-100">
              <div>
                <span className="rounded-full bg-tiby-teal-50 px-2.5 py-0.5 text-[10px] font-bold text-tiby-teal-700 uppercase tracking-wider inline-block mb-1">
                  Administrator Pusat
                </span>
                <h1 className="font-heading text-2xl font-600 text-tiby-ink">
                  Tiby Central Administration
                </h1>
                <p className="mt-0.5 text-xs text-tiby-muted">
                  Monitoring infrastruktur pendampingan kesehatan &amp; kepatuhan faskes.
                </p>
              </div>
            </div>

            {/* System Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-6">
              <div className="rounded-2xl border border-tiby-teal-100 bg-white p-4 shadow-xs">
                <span className="text-xs text-tiby-muted">Fasilitas Kesehatan</span>
                <p className="text-2xl font-heading font-600 text-tiby-ink mt-1">12</p>
                <span className="text-[10px] text-tiby-teal-700 font-semibold mt-1 block">
                  100% Aktif &amp; Terhubung
                </span>
              </div>

              <div className="rounded-2xl border border-tiby-teal-100 bg-white p-4 shadow-xs">
                <span className="text-xs text-tiby-muted">Pasien Terpantau</span>
                <p className="text-2xl font-heading font-600 text-tiby-teal-700 mt-1">148</p>
                <span className="text-[10px] text-tiby-muted mt-1 block">
                  Fase Intensif &amp; Lanjutan
                </span>
              </div>

              <div className="rounded-2xl border border-tiby-teal-100 bg-white p-4 shadow-xs">
                <span className="text-xs text-tiby-muted">Kepatuhan Check-In</span>
                <p className="text-2xl font-heading font-600 text-tiby-ink mt-1">94.2%</p>
                <span className="text-[10px] text-green-600 font-semibold mt-1 block">
                  ↑ 3.1% minggu ini
                </span>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-tiby-cream p-4 shadow-xs">
                <span className="text-xs text-amber-900 font-medium">Perlu Intervensi</span>
                <p className="text-2xl font-heading font-600 text-amber-900 mt-1">4</p>
                <span className="text-[10px] text-amber-800 font-semibold mt-1 block">
                  Red Flag &amp; Putus Follow-Up
                </span>
              </div>
            </div>

            {/* Monitoring & Overview Section */}
            <div className="rounded-3xl border border-tiby-teal-100 bg-white p-6 shadow-[0_4px_20px_rgba(27,158,155,0.04)]">
              <div className="flex items-center justify-between pb-4 border-b border-tiby-teal-100">
                <div>
                  <h2 className="font-heading text-lg font-600 text-tiby-ink">
                    Status Pemantauan Nasional
                  </h2>
                  <p className="text-xs text-tiby-muted">
                    Ringkasan eksekutif alur evaluasi kepatuhan pasien hari ini.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                <div className="rounded-2xl bg-tiby-teal-50/60 p-4 border border-tiby-teal-100">
                  <span className="text-xs font-bold text-tiby-teal-700">🟢 Terkendali</span>
                  <p className="text-2xl font-heading font-600 text-tiby-teal-700 mt-1">138</p>
                  <p className="text-[11px] text-tiby-muted mt-1">
                    Obat diminum lengkap tanpa keluhan efek samping berat.
                  </p>
                </div>

                <div className="rounded-2xl bg-tiby-cream p-4 border border-amber-200">
                  <span className="text-xs font-bold text-amber-900">🟡 Perlu Perhatian</span>
                  <p className="text-2xl font-heading font-600 text-amber-900 mt-1">6</p>
                  <p className="text-[11px] text-tiby-muted mt-1">
                    Keluhan efek samping ringan terdeteksi &amp; edukasi diberikan.
                  </p>
                </div>

                <div className="rounded-2xl bg-tiby-danger p-4 border border-red-200">
                  <span className="text-xs font-bold text-tiby-danger-text">🔴 Segera ke Faskes</span>
                  <p className="text-2xl font-heading font-600 text-tiby-danger-text mt-1">4</p>
                  <p className="text-[11px] text-tiby-muted mt-1">
                    Tiket intervensi diterbitkan untuk tindakan medis lanjutan.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
