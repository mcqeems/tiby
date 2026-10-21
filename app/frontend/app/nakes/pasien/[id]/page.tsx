"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
// ✅ Tambahkan LucideIcon di sini
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
  type LucideIcon,
} from "lucide-react";

import { faskesApi } from "@/lib/api/faskes";
import type {
  RiskSortedPatientItem,
  PatientHistoryItem,
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

// ✅ FIX ESLINT: Ganti 'any' menjadi 'LucideIcon'
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
  const patientId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [summary, setSummary] = useState<RiskSortedPatientItem | null>(null);
  const [history, setHistory] = useState<PatientHistoryItem[]>([]);

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
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-bold ${
              isHighRisk
                ? "bg-red-50 text-red-700 border-red-200"
                : "bg-tiby-teal-50 text-tiby-teal-700 border-tiby-teal-200"
            }`}
          >
            {isHighRisk && <ShieldAlert className="w-3 h-3" />} Skor Risiko:{" "}
            {summary.riskScore}
          </span>
        </div>
      </header>

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

          <DetailCard icon={Users} title="Pengawas (PMO)">
            <div className="mb-4 flex items-center gap-3 rounded-xl bg-gray-50 p-3">
              <Avatar name="Pengawas" size="sm" />
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-tiby-ink">
                  Pengawas Terdaftar
                </p>
                <p className="truncate font-mono text-[11px] text-tiby-muted">
                  @pmo_{summary.username}
                </p>
              </div>
            </div>
            <dl className="space-y-3">
              <InfoRow label="Hubungan">Keluarga</InfoRow>
              <InfoRow label="WhatsApp">-</InfoRow>
            </dl>
          </DetailCard>

          <DetailCard icon={KeyRound} title="Akses Akun">
            <dl className="space-y-3">
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
            <button className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-tiby-ink transition hover:border-tiby-teal-200 hover:bg-tiby-teal-50">
              <KeyRound className="h-4 w-4" /> Kelola Akses & Reset Password
            </button>
          </DetailCard>
        </div>
      </div>
    </div>
  );
}
