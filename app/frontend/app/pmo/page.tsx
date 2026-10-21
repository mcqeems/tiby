"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { handleSignOut } from "../role-guard";
import type { TibyUser } from "@/lib/auth-client";
import { api, ApiError } from "@/lib/api";
import PanduMascot from "@/components/pandu-mascot";
import ChangePasswordForm from "@/components/change-password-form";
import type {
  PmoPatientStatusItem,
  PmoFollowUpAction,
} from "@tiby/ts-shared";

const FOLLOW_UP_ACTIONS: Array<{ value: PmoFollowUpAction; label: string }> = [
  { value: "MENGHUBUNGI_PASIEN", label: "Menghubungi Pasien (Telepon/WA)" },
  { value: "KUNJUNGAN_RUMAH", label: "Kunjungan Rumah Langsung" },
  { value: "MENGHUBUNGI_KELUARGA", label: "Menghubungi Keluarga Pasien" },
  { value: "MENGANTAR_OBAT", label: "Mengantar Stok Obat" },
  { value: "EDUKASI_KONSULTASI", label: "Edukasi & Konsultasi Kepatuhan" },
  { value: "MENGINGATKAN_JADWAL_KONTROL", label: "Mengingatkan Jadwal Kontrol Faskes" },
  { value: "KONSULTASI_FASKES", label: "Konsultasi Bersama Petugas Faskes" },
  { value: "PASIEN_TIDAK_DAPAT_DIHUBUNGI", label: "Pasien Belum Dapat Dihubungi" },
  { value: "LAINNYA", label: "Tindakan Lainnya" },
];

export default function PmoPage() {
  const { data: sessionData, isPending } = useSession();
  const user = sessionData?.user as TibyUser | undefined;

  const [activeTab, setActiveTab] = useState<"pasien" | "profil">("pasien");
  const [patients, setPatients] = useState<PmoPatientStatusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Follow-up modal state
  const [selectedPatient, setSelectedPatient] = useState<PmoPatientStatusItem | null>(null);
  const [actionTaken, setActionTaken] = useState<PmoFollowUpAction>("MENGHUBUNGI_PASIEN");
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [submittingFollowUp, setSubmittingFollowUp] = useState(false);

  useEffect(() => {
    let ignore = false;
    if (user) {
      api.pmo
        .getPatients()
        .then((data) => {
          if (!ignore) {
            setPatients(data || []);
            setLoading(false);
          }
        })
        .catch((err: unknown) => {
          if (!ignore) {
            if (err instanceof ApiError && err.code === "CONSENT_REQUIRED") {
              setErrorMsg("Persetujuan privasi PMO diperlukan sebelum mengakses data pasien.");
            } else {
              setErrorMsg(
                err instanceof Error
                  ? err.message
                  : "Gagal memuat daftar pasien binaan PMO",
              );
            }
            setLoading(false);
          }
        });
    }
    return () => {
      ignore = true;
    };
  }, [user]);

  const fetchPatients = () => {
    setLoading(true);
    setErrorMsg(null);
    api.pmo
      .getPatients()
      .then((data) => {
        setPatients(data || []);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.code === "CONSENT_REQUIRED") {
          setErrorMsg("Persetujuan privasi PMO diperlukan sebelum mengakses data pasien.");
        } else {
          setErrorMsg(
            err instanceof Error
              ? err.message
              : "Gagal memuat daftar pasien binaan PMO",
          );
        }
        setLoading(false);
      });
  };

  const handleOpenFollowUp = (patient: PmoPatientStatusItem) => {
    setSelectedPatient(patient);
    setActionTaken("MENGHUBUNGI_PASIEN");
    setFollowUpNotes("");
  };

  const handleSubmitFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;

    setSubmittingFollowUp(true);
    setErrorMsg(null);
    try {
      await api.pmo.createFollowUp(selectedPatient.treatmentPlanId, {
        actionTaken,
        notes: followUpNotes || "Pendampingan rutin oleh PMO.",
      });

      setSuccessMsg(`Catatan tindak lanjut untuk ${selectedPatient.patientName} berhasil disimpan.`);
      setSelectedPatient(null);
      // Refresh patient status
      await fetchPatients();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Gagal menyimpan catatan tindak lanjut",
      );
    } finally {
      setSubmittingFollowUp(false);
    }
  };

  // Stats calculation
  const totalPatients = patients.length;
  const completedToday = patients.filter((p) => p.isLockedToday).length;
  const needAttention = patients.filter(
    (p) => !p.isLockedToday || p.todayVerdict === "PERLU_PERHATIAN" || p.todayVerdict === "SEGERA_KE_FASKES",
  ).length;

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-tiby-white text-tiby-muted font-body">
        <div className="flex flex-col items-center gap-2">
          <PanduMascot emotion="thinking" size={90} />
          <p className="text-sm">Memuat dashboard PMO...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-tiby-white text-tiby-ink font-body selection:bg-tiby-teal-100 selection:text-tiby-teal-700">
      {/* DESKTOP SIDEBAR (250px) */}
      <aside
        aria-label="Sidebar PMO"
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
                Tiby PMO
              </span>
              <span className="text-[10px] text-tiby-muted uppercase tracking-wider font-semibold">
                Pengawas Minum Obat
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav aria-label="Navigasi Menu PMO" className="space-y-1.5">
            <button
              type="button"
              onClick={() => setActiveTab("pasien")}
              className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition cursor-pointer ${
                activeTab === "pasien"
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
                  d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                />
              </svg>
              <span>Pasien Binaan</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("profil")}
              className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition cursor-pointer ${
                activeTab === "profil"
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
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                />
              </svg>
              <span>Profil &amp; Password</span>
            </button>
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="border-t border-tiby-teal-100 pt-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-tiby-teal-50 text-tiby-teal-700 font-bold text-xs">
              {user?.name?.[0] || user?.username?.[0] || "P"}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-tiby-ink truncate">
                {user?.name || user?.username}
              </p>
              <p className="text-[11px] text-tiby-muted truncate">PMO Pendamping</p>
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

      {/* MAIN CONTAINER */}
      <main className="flex-1 overflow-y-auto pb-16 md:pb-8">
        <div className="mx-auto max-w-[480px] px-5 pt-5 md:pt-8">
          {/* Top Header */}
          <header className="flex items-center justify-between pb-4">
          <div>
            <span className="text-xs font-semibold text-tiby-teal-700 uppercase tracking-wider">
              Pengawas Minum Obat (PMO)
            </span>
            <h1 className="font-heading text-xl font-600 text-tiby-ink">
              Halo, {user?.name?.split(" ")[0] || user?.username || "PMO"} 👋
            </h1>
          </div>

          <button
            onClick={() => handleSignOut()}
            className="rounded-full border border-tiby-teal-100 bg-white p-2 text-tiby-muted transition hover:bg-tiby-teal-50 hover:text-tiby-teal-700 cursor-pointer"
            title="Keluar"
            aria-label="Keluar dari akun"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.75}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
              />
            </svg>
          </button>
        </header>

        {/* Global Notifications */}
        {errorMsg && (
          <div className="mb-4 rounded-2xl border border-red-100 bg-tiby-danger p-3 text-xs text-tiby-danger-text animate-fadeIn flex justify-between items-center">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="ml-2 font-bold">✕</button>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 rounded-2xl border border-teal-100 bg-tiby-teal-50 p-3 text-xs text-tiby-teal-700 animate-fadeIn flex justify-between items-center">
            <span>✓ {successMsg}</span>
            <button onClick={() => setSuccessMsg(null)} className="ml-2 font-bold">✕</button>
          </div>
        )}

        {/* TAB: PASIEN BINAAN */}
        {activeTab === "pasien" && (
          <>
        <div className="mb-5 overflow-hidden rounded-3xl border border-tiby-teal-100 bg-white p-5 shadow-[0_4px_20px_rgba(27,158,155,0.05)]">
          <div className="flex items-center gap-4">
            <PanduMascot emotion="happy" size={75} />
            <div>
              <h2 className="font-heading text-base font-600 text-tiby-ink">
                Semangat Mendampingi!
              </h2>
              <p className="mt-0.5 text-xs text-tiby-muted leading-relaxed">
                Kehadiranmu membantu sahabat sehat tetap disiplin dan lekas pulih.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-2.5 mb-5 text-center">
          <div className="rounded-2xl border border-tiby-teal-100 bg-white p-3 shadow-xs">
            <span className="text-xl font-bold font-heading text-tiby-ink">
              {totalPatients}
            </span>
            <p className="text-[11px] text-tiby-muted mt-0.5">Total Pasien</p>
          </div>

          <div className="rounded-2xl border border-tiby-teal-100 bg-tiby-teal-50/60 p-3 shadow-xs">
            <span className="text-xl font-bold font-heading text-tiby-teal-700">
              {completedToday}
            </span>
            <p className="text-[11px] text-tiby-teal-700 mt-0.5">Sudah Minum</p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-tiby-cream p-3 shadow-xs">
            <span className="text-xl font-bold font-heading text-amber-900">
              {needAttention}
            </span>
            <p className="text-[11px] text-amber-800 mt-0.5">Perlu Dicek</p>
          </div>
        </div>

        {/* Patient Supervision List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-base font-600 text-tiby-ink">
              Daftar Pasien Binaan
            </h2>
            <button
              onClick={fetchPatients}
              className="text-xs font-semibold text-tiby-teal-700 hover:underline cursor-pointer"
            >
              Segarkan Data
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-tiby-muted">
              <PanduMascot emotion="thinking" size={60} className="mx-auto mb-2" />
              Memuat data pasien...
            </div>
          ) : patients.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-tiby-teal-100 p-8 text-center bg-white/60">
              <PanduMascot emotion="idle" size={70} className="mx-auto mb-2" />
              <h3 className="font-heading text-sm font-600 text-tiby-ink">
                Belum Ada Pasien Tertaut
              </h3>
              <p className="mt-1 text-xs text-tiby-muted">
                Petugas Faskes akan menugaskan pasien binaan kepadamu.
              </p>
            </div>
          ) : (
            patients.map((patient) => {
              const isDone = patient.isLockedToday;
              const hasAlert =
                patient.todayVerdict === "SEGERA_KE_FASKES" ||
                patient.consecutiveSilenceDays >= 2;

              return (
                <div
                  key={patient.treatmentPlanId}
                  className={`rounded-2xl border p-4 transition shadow-xs ${
                    hasAlert
                      ? "border-red-200 bg-red-50/40"
                      : isDone
                        ? "border-tiby-teal-100 bg-white"
                        : "border-amber-200 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-heading text-base font-600 text-tiby-ink">
                        {patient.patientName}
                      </h3>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="rounded-full bg-tiby-teal-50 px-2 py-0.5 text-[10px] font-bold text-tiby-teal-700">
                          {patient.phase}
                        </span>
                        <span className="text-[11px] text-tiby-muted">
                          🔥 {patient.currentStreak} Hari Beruntun
                        </span>
                      </div>
                    </div>

                    {/* Status Pill Badge */}
                    <div>
                      {isDone ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-tiby-teal-50 px-2.5 py-1 text-xs font-semibold text-tiby-teal-700">
                          ✓ Sudah Minum
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-tiby-cream px-2.5 py-1 text-xs font-semibold text-amber-900">
                          ⏳ Belum Check-in
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Warning if silent */}
                  {patient.consecutiveSilenceDays > 0 && !isDone && (
                    <div className="mt-2.5 rounded-xl bg-amber-50 p-2 text-[11px] text-amber-800 border border-amber-200">
                      ⚠️ Belum ada kabar selama {patient.consecutiveSilenceDays} hari.
                    </div>
                  )}

                  {/* Red flag alert */}
                  {patient.todayVerdict === "SEGERA_KE_FASKES" && (
                    <div className="mt-2.5 rounded-xl bg-red-100/60 p-2 text-[11px] text-red-800 border border-red-200">
                      🚨 Pasien melaporkan keluhan berat! Segera hubungi faskes atau lakukan kunjungan.
                    </div>
                  )}

                  {/* Follow Up Action Button */}
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-[11px] text-tiby-muted">
                      {isDone ? "Kondisi terpantau baik" : "Perlu diingatkan"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenFollowUp(patient)}
                      className="rounded-full bg-tiby-teal-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-tiby-teal-700 transition cursor-pointer"
                    >
                      Tindak Lanjut PMO
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      </main>

      {/* FOLLOW UP MODAL */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs px-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-tiby-teal-100 animate-fadeIn">
            <h3 className="font-heading text-lg font-600 text-tiby-ink">
              Catatan Pendampingan
            </h3>
            <p className="mt-0.5 text-xs text-tiby-muted">
              Pasien: <span className="font-semibold text-tiby-ink">{selectedPatient.patientName}</span>
            </p>

            <form onSubmit={handleSubmitFollowUp} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-tiby-ink mb-1">
                  Tindakan yang Dilakukan
                </label>
                <select
                  value={actionTaken}
                  onChange={(e) => setActionTaken(e.target.value as PmoFollowUpAction)}
                  className="w-full rounded-xl border border-tiby-teal-100 bg-white px-3 py-2 text-xs text-tiby-ink focus:outline-none focus:ring-2 focus:ring-tiby-teal-600"
                >
                  {FOLLOW_UP_ACTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-tiby-ink mb-1">
                  Catatan Tambahan
                </label>
                <textarea
                  rows={3}
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                  placeholder="Contoh: Pasien sudah diingatkan lewat telepon dan meminum obat saat itu juga."
                  className="w-full rounded-xl border border-tiby-teal-100 bg-white p-3 text-xs text-tiby-ink placeholder:text-tiby-muted/50 focus:outline-none focus:ring-2 focus:ring-tiby-teal-600"
                  required
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPatient(null)}
                  className="flex-1 rounded-full border border-tiby-teal-100 py-2.5 text-xs font-medium text-tiby-muted hover:bg-gray-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingFollowUp}
                  className="flex-1 rounded-full bg-tiby-teal-600 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-tiby-teal-700 disabled:opacity-50 cursor-pointer"
                >
                  {submittingFollowUp ? "Menyimpan..." : "Simpan Catatan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
