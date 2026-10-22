"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Flame,
  ShieldAlert,
  VolumeX,
  ClipboardList,
  Pill,
  Users,
  KeyRound,
  FileText,
  Eye,
  EyeOff,
  X,
  Loader2,
  type LucideIcon,
} from "lucide-react";

import { faskesApi } from "@/lib/api/faskes";
import { usersApi } from "@/lib/api/users";
import { usePopup } from "@/components/ui/popup-provider"; // ✅ Import Popup
import type {
  RiskSortedPatientItem,
  PatientHistoryItem,
  PatientPmo,
} from "@/lib/types/faskes";

// ─── UTILITY & SHARED COMPONENTS ─────────────────────────────────────────────

function Avatar({
  name,
  size = "md",
}: {
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeCls =
    size === "lg"
      ? "h-14 w-14 text-lg"
      : size === "sm"
        ? "h-9 w-9 text-xs"
        : "h-11 w-11 text-sm";
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-tiby-teal-50 font-heading font-semibold text-tiby-teal-700 ${sizeCls}`}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

function DetailCard({
  icon: Icon,
  title,
  aside,
  children,
}: {
  icon: LucideIcon;
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-2xs">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
        <div className="flex items-center gap-2 text-tiby-ink">
          <Icon className="h-4 w-4 text-tiby-teal-600" />
          <h3 className="font-heading text-sm font-semibold">{title}</h3>
        </div>
        {aside}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <dt className="text-tiby-muted">{label}</dt>
      <dd className="font-medium text-tiby-ink text-right">{children}</dd>
    </div>
  );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────

export default function PatientDetailPage() {
  const params = useParams();
  const patientId = params.id as string; // = treatment plan id
  const { notify, confirm } = usePopup(); // ✅ Inisialisasi Popup

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [summary, setSummary] = useState<RiskSortedPatientItem | null>(null);
  const [history, setHistory] = useState<PatientHistoryItem[]>([]);

  // Menyimpan ID User untuk Reset Password
  const [patientUserId, setPatientUserId] = useState<string | null>(null);
  const [pmoUserId, setPmoUserId] = useState<string | null>(null);
  const [userIdLoading, setUserIdLoading] = useState(false);

  // State untuk Modal Reset Password
  const [resetOpen, setResetOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<"PASIEN" | "PMO" | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const pmo: PatientPmo | null = summary?.pmo ?? null;

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        setLoading(true);
        setErrorMsg(null);

        const historyRes = await faskesApi.getPatientHistory(patientId, 1, 50);
        const listRes = await faskesApi.getPatients({ limit: 100 });
        const patientData = listRes.items?.find((p) => p.id === patientId);

        if (!patientData) {
          if (active)
            setErrorMsg("Data pasien tidak ditemukan atau sudah dihapus.");
          return;
        }

        if (active) {
          setSummary(patientData);
          setHistory(historyRes.items || []);
        }

        // ✅ Lookup userId Pasien dan PMO sekaligus
        if (patientData.username) {
          setUserIdLoading(true);
          try {
            const allUsers = await usersApi.getAll();

            // Cari ID Pasien
            const foundPatient = allUsers.find(
              (u) => u.username === patientData.username && u.role === "PASIEN",
            );
            if (active) setPatientUserId(foundPatient?.id ?? null);

            // Cari ID PMO (jika ada)
            if (patientData.pmo?.username) {
              const foundPmo = allUsers.find(
                (u) =>
                  u.username === patientData.pmo?.username && u.role === "PMO",
              );
              if (active) setPmoUserId(foundPmo?.id ?? null);
            }
          } catch {
            if (active) {
              setPatientUserId(null);
              setPmoUserId(null);
            }
          } finally {
            if (active) setUserIdLoading(false);
          }
        }
      } catch (err: unknown) {
        if (active) {
          setErrorMsg(
            err instanceof Error ? err.message : "Gagal memuat detail pasien.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    if (patientId) loadData();
    return () => {
      active = false;
    };
  }, [patientId]);

  // ✅ Buka Modal dengan Target (PASIEN atau PMO)
  const openResetModal = (target: "PASIEN" | "PMO") => {
    setResetTarget(target);
    setNewPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setResetOpen(true);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      return notify({
        variant: "warning",
        title: "Password Terlalu Pendek",
        description: "Password minimal 8 karakter.",
        confirmLabel: "Mengerti",
      });
    }
    if (newPassword !== confirmPassword) {
      return notify({
        variant: "warning",
        title: "Konfirmasi Tidak Cocok",
        description: "Pastikan konfirmasi password sama dengan password baru.",
        confirmLabel: "Mengerti",
      });
    }

    const targetId = resetTarget === "PASIEN" ? patientUserId : pmoUserId;
    if (!targetId) {
      return notify({
        variant: "danger",
        title: "User ID Tidak Ditemukan",
        description: "Data pengguna ini belum tersinkronisasi dengan baik.",
        confirmLabel: "Tutup",
      });
    }

    // Konfirmasi sebelum mengeksekusi
    const isConfirmed = await confirm({
      variant: "warning",
      badgeText: "Reset Password",
      title: `Reset Password ${resetTarget === "PASIEN" ? "Pasien" : "PMO"}?`,
      description: `Password untuk ${resetTarget === "PASIEN" ? summary?.patientName : pmo?.fullName} akan diganti dengan yang baru.`,
      confirmLabel: "Ya, Reset",
      cancelLabel: "Batal",
    });

    if (!isConfirmed) return;

    try {
      setResetLoading(true);
      await usersApi.resetPassword(targetId, newPassword);

      setResetOpen(false);
      await notify({
        variant: "success",
        badgeText: "Berhasil",
        title: "Password Direset",
        description: `Password ${resetTarget === "PASIEN" ? "Pasien" : "PMO"} berhasil diperbarui.`,
        confirmLabel: "Tutup",
      });
    } catch (err: unknown) {
      await notify({
        variant: "danger",
        badgeText: "Gagal",
        title: "Reset Password Gagal",
        description:
          err instanceof Error ? err.message : "Terjadi kesalahan pada server.",
        confirmLabel: "Tutup",
      });
    } finally {
      setResetLoading(false);
    }
  };

  // ─── Loading state ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-5 max-w-5xl mx-auto pb-10">
        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="h-24 rounded-2xl border border-gray-200 bg-white animate-pulse" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 rounded-2xl border border-gray-200 bg-white animate-pulse"
            />
          ))}
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="h-80 rounded-2xl border border-gray-200 bg-white lg:col-span-2 animate-pulse" />
          <div className="h-80 rounded-2xl border border-gray-200 bg-white animate-pulse" />
        </div>
      </div>
    );
  }

  // ─── Error state ──────────────────────────────────────────────────────
  if (errorMsg || !summary) {
    return (
      <div className="max-w-3xl mx-auto mt-10">
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-red-200 bg-red-50 px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-red-500">
            <ShieldAlert className="h-6 w-6" />
          </span>
          <h2 className="mt-4 font-heading text-lg font-semibold text-red-900">
            Detail pasien gagal dimuat
          </h2>
          <p className="mt-1 max-w-sm text-sm text-red-700">
            {errorMsg || "Pasien tidak ditemukan."}
          </p>
          <Link
            href="/nakes/pasien"
            className="mt-6 rounded-xl bg-white border border-red-200 px-5 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 transition"
          >
            Kembali ke Daftar Pasien
          </Link>
        </div>
      </div>
    );
  }

  const isHighRisk =
    summary.riskScore >= 100 || summary.consecutiveSilenceDays >= 3;

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-10">
      <Link
        href="/nakes/pasien"
        className="group inline-flex items-center gap-1.5 text-xs font-semibold text-tiby-muted transition hover:text-tiby-teal-700"
      >
        <ArrowLeft className="h-3.5 w-3.5 transition group-hover:-translate-x-0.5" />{" "}
        Daftar Pasien
      </Link>

      {/* ─── Header ────────────────────────────────────────────────── */}
      <header
        className={`flex flex-col gap-4 rounded-2xl border bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between sm:p-6 ${isHighRisk ? "border-red-200" : "border-gray-200"}`}
      >
        <div className="flex min-w-0 items-center gap-4">
          <Avatar name={summary.patientName} size="lg" />
          <div className="min-w-0">
            <h1 className="truncate font-heading text-xl font-semibold text-tiby-ink">
              {summary.patientName}
            </h1>
            <p className="truncate font-mono text-xs text-tiby-muted">
              @{summary.username}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-tiby-teal-50 px-2 py-0.5 text-[10px] font-bold text-tiby-teal-700 border border-tiby-teal-100 uppercase">
            {summary.phase}
          </span>
          {summary.todayCheckInLocked ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-green-50 border border-green-200 px-2 py-1 text-[11px] font-medium text-green-700">
              <CheckCircle2 className="w-3.5 h-3.5" /> Sudah Check-in
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-1 text-[11px] font-medium text-amber-800">
              <Clock className="w-3.5 h-3.5" /> Belum Check-in
            </span>
          )}
          <span
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-bold ${isHighRisk ? "bg-red-50 text-red-700 border-red-200" : "bg-tiby-teal-50 text-tiby-teal-700 border-tiby-teal-200"}`}
          >
            {isHighRisk && <ShieldAlert className="w-3 h-3" />} Skor Risiko:{" "}
            {summary.riskScore}
          </span>
        </div>
      </header>

      {/* ─── Stat Cards ────────────────────────────────────────────── */}
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <li className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-tiby-muted">
              Streak
            </p>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <Flame className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-2 font-heading text-xl font-semibold text-tiby-ink">
            {summary.currentStreak} Hari
          </p>
          <p className="mt-0.5 text-[11px] text-tiby-muted">
            Check-in beruntun
          </p>
        </li>
        <li className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-tiby-muted">
              Skor Risiko
            </p>
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-lg ${isHighRisk ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}
            >
              <ShieldAlert className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-2 font-heading text-xl font-semibold text-tiby-ink">
            {summary.riskScore}
          </p>
          <p className="mt-0.5 text-[11px] text-tiby-muted">
            {isHighRisk ? "Perlu Perhatian" : "Terkendali"}
          </p>
        </li>
        <li className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-tiby-muted">
              Check-In Hari Ini
            </p>
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-lg ${summary.todayCheckInLocked ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
            >
              {summary.todayCheckInLocked ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <Clock className="h-3.5 w-3.5" />
              )}
            </span>
          </div>
          <p className="mt-2 font-heading text-xl font-semibold text-tiby-ink">
            {summary.todayCheckInLocked ? "Terkunci" : "Belum"}
          </p>
          <p className="mt-0.5 text-[11px] text-tiby-muted">
            {summary.todayCheckInLocked ? "Sudah tercatat" : "Menunggu pasien"}
          </p>
        </li>
        <li className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-tiby-muted">
              Tanpa Respons
            </p>
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-lg ${summary.consecutiveSilenceDays >= 3 ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-500"}`}
            >
              <VolumeX className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-2 font-heading text-xl font-semibold text-tiby-ink">
            {summary.consecutiveSilenceDays} Hari
          </p>
          <p className="mt-0.5 text-[11px] text-tiby-muted">Berturut-turut</p>
        </li>
      </ul>

      {/* ─── Main Grid ─────────────────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DetailCard
            icon={ClipboardList}
            title="Riwayat Aktivitas & Check-In"
            aside={
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold text-gray-600">
                {history.length} catatan
              </span>
            }
          >
            {history.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                  <FileText className="h-5 w-5" />
                </span>
                <p className="mt-3 text-sm font-semibold text-tiby-ink">
                  Belum ada riwayat
                </p>
                <p className="mt-1 max-w-xs text-xs text-tiby-muted">
                  Catatan akan muncul setelah pasien melakukan check-in.
                </p>
              </div>
            ) : (
              <ol>
                {history.map((entry, index) => {
                  const isLast = index === history.length - 1;
                  const isSystem = entry.actorRole === "SYSTEM";
                  return (
                    <li
                      key={entry.id}
                      className="relative flex gap-4 pb-6 last:pb-0"
                    >
                      {!isLast && (
                        <span className="absolute left-4 top-8 -ml-px h-[calc(100%-2rem)] w-px bg-gray-200" />
                      )}
                      <span
                        className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ${isSystem ? "bg-gray-50 text-gray-500 ring-gray-200" : "bg-tiby-teal-50 text-tiby-teal-700 ring-tiby-teal-200"}`}
                      >
                        {isSystem ? (
                          <Clock className="h-4 w-4" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                          <p className="text-[13px] font-semibold text-tiby-ink">
                            {entry.reasonOrSummary || entry.eventType}
                          </p>
                          <time className="text-[11px] text-tiby-muted">
                            {new Date(entry.createdAt).toLocaleString("id-ID")}
                          </time>
                        </div>
                        <div className="mt-1.5 flex gap-1.5">
                          <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600 font-medium uppercase">
                            {entry.eventType}
                          </span>
                          <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600 font-medium">
                            {entry.actorRole}
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </DetailCard>
        </div>

        <div className="space-y-5">
          <DetailCard icon={Pill} title="Rencana Terapi">
            <dl className="space-y-3">
              <InfoRow label="Regimen">{summary.regimenCode}</InfoRow>
              <InfoRow label="Dosis harian">
                {summary.dailyPillQuota} butir
              </InfoRow>
              <InfoRow label="Jam pengingat">08:00</InfoRow>
              <InfoRow label="Tanggal mulai">
                {new Date(summary.startDate).toLocaleDateString("id-ID")}
              </InfoRow>
            </dl>
          </DetailCard>

          {/* ─── PMO Card dengan Tombol Reset ───────────────────── */}
          <DetailCard
            icon={Users}
            title="Pengawas (PMO)"
            aside={
              pmo?.isPrimary ? (
                <span className="rounded-full bg-tiby-teal-50 px-2 py-0.5 text-[10px] font-bold text-tiby-teal-700 border border-tiby-teal-100 uppercase">
                  Primary
                </span>
              ) : undefined
            }
          >
            {pmo ? (
              <>
                <div className="mb-4 flex items-center gap-3 rounded-xl bg-gray-50 p-3">
                  <Avatar name={pmo.fullName} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-tiby-ink">
                      {pmo.fullName}
                    </p>
                    <p className="truncate font-mono text-[11px] text-tiby-muted">
                      @{pmo.username}
                    </p>
                  </div>
                </div>
                <dl className="space-y-3 mb-4">
                  <InfoRow label="Hubungan">{pmo.relationship || "-"}</InfoRow>
                  <InfoRow label="WhatsApp">
                    {pmo.whatsappNumber || "-"}
                  </InfoRow>
                </dl>
                {/* ✅ Tombol Reset Password PMO */}
                <button
                  onClick={() => openResetModal("PMO")}
                  disabled={!pmoUserId || userIdLoading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-[11px] font-semibold text-tiby-ink transition hover:border-tiby-teal-200 hover:bg-tiby-teal-50 disabled:opacity-50"
                >
                  <KeyRound className="h-3.5 w-3.5" /> Reset Password PMO
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center py-6 text-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                  <Users className="h-5 w-5" />
                </span>
                <p className="mt-2 text-sm font-semibold text-tiby-ink">
                  Belum ada PMO
                </p>
                <p className="mt-1 text-xs text-tiby-muted">
                  Pasien belum menautkan pengawas minum obat.
                </p>
              </div>
            )}
          </DetailCard>

          {/* ─── Akses Akun Pasien ──────────────────────────────── */}
          <DetailCard icon={KeyRound} title="Akses Akun Pasien">
            <dl className="space-y-3 mb-4">
              <InfoRow label="Username">
                <span className="font-mono">@{summary.username}</span>
              </InfoRow>
              <InfoRow label="WhatsApp">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className={`h-2 w-2 rounded-full ${summary.whatsappVerified ? "bg-green-500" : "bg-gray-300"}`}
                  />
                  {summary.whatsappVerified ? "Terverifikasi" : "Belum"}
                </span>
              </InfoRow>
            </dl>
            {/* ✅ Tombol Reset Password Pasien */}
            <button
              onClick={() => openResetModal("PASIEN")}
              disabled={!patientUserId || userIdLoading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-tiby-ink transition hover:border-tiby-teal-200 hover:bg-tiby-teal-50 disabled:opacity-50"
            >
              {userIdLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              Reset Password Pasien
            </button>
          </DetailCard>
        </div>
      </div>

      {/* ─── MODAL RESET PASSWORD (Dinamis untuk Pasien & PMO) ────────── */}
      {resetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-tiby-teal-600" />
                <h3 className="font-heading text-sm font-semibold text-tiby-ink">
                  Reset Password —{" "}
                  {resetTarget === "PASIEN"
                    ? summary.patientName
                    : pmo?.fullName}
                </h3>
              </div>
              <button
                onClick={() => !resetLoading && setResetOpen(false)}
                className="rounded-lg p-1 text-tiby-muted hover:bg-gray-100 disabled:opacity-50"
                disabled={resetLoading}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4 p-5">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-tiby-ink">
                  Password Baru
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 8 karakter"
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 pr-10 text-sm text-tiby-ink outline-none transition focus:border-tiby-teal-400 focus:ring-2 focus:ring-tiby-teal-100"
                    disabled={resetLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-tiby-muted hover:bg-gray-100"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-tiby-ink">
                  Konfirmasi Password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi password baru"
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-tiby-ink outline-none transition focus:border-tiby-teal-400 focus:ring-2 focus:ring-tiby-teal-100"
                  disabled={resetLoading}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetOpen(false)}
                  disabled={resetLoading}
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-semibold text-tiby-ink hover:bg-gray-50 disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-tiby-teal-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-tiby-teal-700 disabled:opacity-60"
                >
                  {resetLoading && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  {resetLoading ? "Menyimpan..." : "Simpan Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
