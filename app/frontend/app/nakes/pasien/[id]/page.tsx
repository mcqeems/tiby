"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
  Ticket,
  type LucideIcon,
} from "lucide-react";

import { faskesApi } from "@/lib/api/faskes";
import { usersApi } from "@/lib/api/users";
import { usePopup } from "@/components/ui/popup-provider"; // ✅ Popup
import type {
  RiskSortedPatientItem,
  PatientHistoryItem,
  PatientPmo,
} from "@/lib/types/faskes";


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
  const router = useRouter();
  const patientId = params.id as string;
  const { notify, confirm } = usePopup();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [summary, setSummary] = useState<RiskSortedPatientItem | null>(null);
  const [history, setHistory] = useState<PatientHistoryItem[]>([]);

  // State User ID untuk Reset Password
  const [patientUserId, setPatientUserId] = useState<string | null>(null);
  const [pmoUserId, setPmoUserId] = useState<string | null>(null);
  const [userIdLoading, setUserIdLoading] = useState(false);

  // State Modal Reset Password
  const [resetOpen, setResetOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<"PASIEN" | "PMO" | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // ✅ State Modal Buat Tiket
  const [ticketOpen, setTicketOpen] = useState(false);
  const [ticketPriority, setTicketPriority] = useState<"HIGH" | "CRITICAL">(
    "HIGH",
  );
  const [ticketReason, setTicketReason] = useState("");
  const [ticketLoading, setTicketLoading] = useState(false);

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

        // Lookup userId
        if (patientData.username) {
          setUserIdLoading(true);
          try {
            const allUsers = await usersApi.getAll();
            const foundPatient = allUsers.find(
              (u) => u.username === patientData.username && u.role === "PASIEN",
            );
            if (active) setPatientUserId(foundPatient?.id ?? null);

            if (patientData.pmo?.username) {
              const foundPmo = allUsers.find(
                (u) =>
                  u.username === patientData.pmo?.username && u.role === "PMO",
              );
              if (active) setPmoUserId(foundPmo?.id ?? null);
            }
          } catch {
            // Abaikan error
          } finally {
            if (active) setUserIdLoading(false);
          }
        }
      } catch (err: unknown) {
        if (active)
          setErrorMsg(
            err instanceof Error ? err.message : "Gagal memuat detail pasien.",
          );
      } finally {
        if (active) setLoading(false);
      }
    }

    if (patientId) loadData();
    return () => {
      active = false;
    };
  }, [patientId]);

  const openResetModal = (target: "PASIEN" | "PMO") => {
    setResetTarget(target);
    setNewPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setResetOpen(true);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8)
      return notify({
        variant: "warning",
        title: "Password Terlalu Pendek",
        description: "Minimal 8 karakter.",
        confirmLabel: "Mengerti",
      });
    if (newPassword !== confirmPassword)
      return notify({
        variant: "warning",
        title: "Konfirmasi Salah",
        description: "Konfirmasi tidak cocok.",
        confirmLabel: "Mengerti",
      });

    const targetId = resetTarget === "PASIEN" ? patientUserId : pmoUserId;
    if (!targetId)
      return notify({
        variant: "danger",
        title: "Gagal",
        description: "User ID tidak ditemukan.",
        confirmLabel: "Tutup",
      });

    const isConfirmed = await confirm({
      variant: "warning",
      title: `Reset Password ${resetTarget}?`,
      description: "Password pengguna akan diganti dengan yang baru.",
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
        title: "Password Direset",
        description: "Password berhasil diperbarui.",
        confirmLabel: "Tutup",
      });
    } catch (err: unknown) {
      await notify({
        variant: "danger",
        title: "Gagal",
        description: err instanceof Error ? err.message : "Server error",
        confirmLabel: "Tutup",
      });
    } finally {
      setResetLoading(false);
    }
  };

  // ✅ Fungsi Buat Tiket
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (ticketReason.trim().length < 5) {
      return notify({
        variant: "warning",
        title: "Alasan Kurang",
        description: "Mohon isi alasan minimal 5 karakter.",
        confirmLabel: "Mengerti",
      });
    }

    try {
      setTicketLoading(true);
      await faskesApi.createTicket({
        treatmentPlanId: patientId,
        priority: ticketPriority,
        reason: ticketReason,
      });

      setTicketOpen(false);
      setTicketReason("");
      await notify({
        variant: "success",
        badgeText: "Tiket Dibuat",
        title: "Berhasil",
        description: "Tiket tindak lanjut telah dikirim ke dashboard.",
        confirmLabel: "Tutup",
      });
    } catch (err: unknown) {
      await notify({
        variant: "danger",
        title: "Gagal",
        description: err instanceof Error ? err.message : "Server error",
        confirmLabel: "Tutup",
      });
    } finally {
      setTicketLoading(false);
    }
  };

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
      </div>
    );
  }

  if (errorMsg || !summary) {
    return (
      <div className="max-w-3xl mx-auto mt-10">
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-red-200 bg-red-50 px-6 py-16 text-center">
          <ShieldAlert className="h-10 w-10 text-red-500 mb-4" />
          <h2 className="font-heading text-lg font-semibold text-red-900">
            Detail pasien gagal dimuat
          </h2>
          <p className="mt-1 text-sm text-red-700">
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

          {/* ✅ TOMBOL BUAT TIKET MANUAL */}
          <button
            onClick={() => setTicketOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-200 transition"
          >
            <Ticket className="w-4 h-4" /> Buat Tiket
          </button>
        </div>
      </header>

      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* ... (Stat Cards tetap sama) ... */}
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
        </li>
      </ul>

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
            {/* ... (Timeline History tetap sama) ... */}
            {history.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <FileText className="h-8 w-8 text-gray-300 mb-2" />
                <p className="text-sm font-semibold text-tiby-ink">
                  Belum ada riwayat
                </p>
              </div>
            ) : (
              <ol>
                {history.map((entry, index) => (
                  <li
                    key={entry.id}
                    className="relative flex gap-4 pb-6 last:pb-0"
                  >
                    <span
                      className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ${entry.actorRole === "SYSTEM" ? "bg-gray-50 text-gray-500 ring-gray-200" : "bg-tiby-teal-50 text-tiby-teal-700 ring-tiby-teal-200"}`}
                    >
                      {entry.actorRole === "SYSTEM" ? (
                        <Clock className="h-4 w-4" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <p className="text-[13px] font-semibold text-tiby-ink">
                          {entry.reasonOrSummary || entry.eventType}
                        </p>
                        <time className="text-[11px] text-tiby-muted">
                          {new Date(entry.createdAt).toLocaleString("id-ID")}
                        </time>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </DetailCard>
        </div>

        <div className="space-y-5">
          {/* ... (Card Terapi, PMO, Akses Akun tetap sama) ... */}
          <DetailCard icon={Pill} title="Rencana Terapi">
            <dl className="space-y-3">
              <InfoRow label="Regimen">{summary.regimenCode}</InfoRow>
              <InfoRow label="Dosis harian">
                {summary.dailyPillQuota} butir
              </InfoRow>
            </dl>
          </DetailCard>

          <DetailCard icon={Users} title="Pengawas (PMO)">
            {pmo ? (
              <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
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
            ) : (
              <p className="text-xs text-tiby-muted text-center py-4">
                Belum ada PMO
              </p>
            )}
          </DetailCard>
        </div>
      </div>

      {/* ─── MODAL BUAT TIKET MANUAL ─── */}
      {ticketOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 bg-amber-50/50">
              <div className="flex items-center gap-2">
                <Ticket className="h-4 w-4 text-amber-600" />
                <h3 className="font-heading text-sm font-semibold text-tiby-ink">
                  Buat Tiket Manual
                </h3>
              </div>
              <button
                onClick={() => setTicketOpen(false)}
                className="text-gray-400 hover:bg-gray-100 p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateTicket} className="p-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-tiby-ink">
                  Prioritas Tiket
                </label>
                <select
                  value={ticketPriority}
                  onChange={(e) =>
                    setTicketPriority(e.target.value as "HIGH" | "CRITICAL")
                  }
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-tiby-teal-600 outline-none"
                >
                  <option value="HIGH">High (Perlu Perhatian)</option>
                  <option value="CRITICAL">Critical (Darurat)</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-tiby-ink">
                  Alasan / Catatan
                </label>
                <textarea
                  value={ticketReason}
                  onChange={(e) => setTicketReason(e.target.value)}
                  placeholder="Contoh: Pasien terlihat sangat lemas saat dikunjungi..."
                  className="w-full h-24 rounded-xl border border-gray-200 p-3 text-sm focus:ring-2 focus:ring-tiby-teal-600 outline-none resize-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTicketOpen(false)}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-xs font-semibold hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={ticketLoading}
                  className="flex-1 rounded-xl bg-tiby-teal-600 text-white py-2.5 text-xs font-semibold hover:bg-tiby-teal-700 disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {ticketLoading && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  Kirim Tiket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL RESET PASSWORD (Tetap sama) ─── */}
      {resetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-tiby-teal-600" />
                <h3 className="font-heading text-sm font-semibold text-tiby-ink">
                  Reset Password {resetTarget}
                </h3>
              </div>
              <button
                onClick={() => setResetOpen(false)}
                className="text-gray-400 hover:bg-gray-100 p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleResetPassword} className="p-5 space-y-4">
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
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 pr-10 text-sm outline-none focus:ring-2 focus:ring-tiby-teal-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 p-1"
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
                  Konfirmasi
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi password"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-tiby-teal-600"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetOpen(false)}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-xs font-semibold hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="flex-1 rounded-xl bg-tiby-teal-600 text-white py-2.5 text-xs font-semibold hover:bg-tiby-teal-700 disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {resetLoading && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  Simpan Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
