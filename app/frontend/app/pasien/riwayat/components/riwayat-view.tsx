"use client";

import { useState, useEffect } from "react";
import { Skeleton, SkeletonRegion, SkeletonRows } from "@/components/ui/skeleton";
import { formatShortDate, formatTime, localDateKey } from "@/lib/format";
import { motion } from "motion/react";
import { checkInsApi } from "@/lib/api/check-in";
import { statsApi } from "@/lib/api/stats";
import type { PatientStats } from "@/lib/types/stats";
import type { CheckInHistoryItem } from "@/lib/types/check-in";
import TreatmentCalendar from "./treatment-calendar";
import {
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  CalendarDays,
  Pill,
  Activity,
  Flame,
  FileText,
} from "lucide-react";

const getVerdictStyle = (verdict: string | null) => {
  switch (verdict) {
    case "TERKENDALI":
      return {
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        border: "border-emerald-200",
        icon: CheckCircle2,
        label: "Terkendali",
      };
    case "PERLU_PERHATIAN":
      return {
        bg: "bg-amber-50",
        text: "text-amber-700",
        border: "border-amber-200",
        icon: AlertTriangle,
        label: "Perlu Perhatian",
      };
    case "SEGERA_KE_FASKES":
      return {
        bg: "bg-red-50",
        text: "text-red-700",
        border: "border-red-200",
        icon: ShieldAlert,
        label: "Segera ke Faskes",
      };
    default:
      return {
        bg: "bg-gray-50",
        text: "text-gray-700",
        border: "border-gray-200",
        icon: Activity,
        label: "Aktivitas",
      };
  }
};

export default function RiwayatView() {
  const [history, setHistory] = useState<CheckInHistoryItem[]>([]);
  const [stats, setStats] = useState<PatientStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function fetchHistory() {
      try {
        const res = await checkInsApi.getHistory({ limit: 50 });
        if (active) setHistory(res.items || []);
      } catch (err) {
        console.error("Gagal memuat riwayat:", err);
      }

      try {
        const res = await statsApi.getStats();
        if (active && res.role === "PASIEN") setStats(res as PatientStats);
      } catch (err) {
        console.error("Gagal memuat statistik:", err);
      }

      if (active) setLoading(false);
    }
    fetchHistory();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <SkeletonRegion label="Memuat riwayat check-in" className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-3.5 w-72" />
        </div>
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Skeleton className="h-32 w-full rounded-3xl" />
            <Skeleton className="h-72 w-full rounded-2xl" />
          </div>
          <SkeletonRows rows={5} />
        </div>
      </SkeletonRegion>
    );
  }

  // Use the persisted streak, the same value the dashboard shows.
  const currentStreak = stats?.currentStreak ?? 0;

  const startDate =
    history.length > 0
      ? localDateKey(
          [...history].sort(
            (a, b) =>
              new Date(a.submittedAt).getTime() -
              new Date(b.submittedAt).getTime(),
          )[0].submittedAt,
        )
      : localDateKey(new Date().toISOString());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-tiby-ink">
          Riwayat Check-In
        </h1>
        <p className="mt-1 text-sm text-tiby-muted">
          Catatan perjalanan pengobatan dan laporan harian Anda.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-tiby-teal-600 rounded-3xl p-6 text-white shadow-lg shadow-tiby-teal-600/20 relative overflow-hidden">
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="text-tiby-teal-100 text-sm font-medium mb-1">
                  Total Check-in Beruntun
                </p>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-heading font-bold">
                    {currentStreak}
                  </span>
                  <span className="text-lg font-medium mb-1">Hari</span>
                </div>
                <p className="text-xs text-tiby-teal-100 mt-2 max-w-50">
                  {currentStreak > 0
                    ? "Api semangatmu menyala! Pertahankan konsistensimu."
                    : "Ayo lakukan check-in hari ini untuk menyalakan apimu kembali."}
                </p>
              </div>

              <div className="relative w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm shrink-0">
                {currentStreak > 0 && (
                  <motion.div
                    className="absolute inset-0 bg-orange-500/20 rounded-full blur-xl"
                    animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.8, 0.4] }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                )}
                <motion.div
                  animate={
                    currentStreak > 0
                      ? {
                          scale: [1, 1.15, 0.95, 1.05, 1],
                          rotate: [0, -5, 5, -2, 0],
                          y: [0, -2, 2, 0],
                        }
                      : {}
                  }
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <Flame
                    className={`w-10 h-10 transition-colors duration-500 ${
                      currentStreak > 0
                        ? "text-orange-300 fill-orange-300 drop-shadow-[0_0_12px_rgba(249,115,22,0.8)]"
                        : "text-white/40 fill-white/10"
                    }`}
                  />
                </motion.div>
              </div>
            </div>
          </div>

          <TreatmentCalendar checkIns={history} startDate={startDate} />
        </div>

        <div className="lg:col-span-1 space-y-4">
          <h2 className="font-heading font-bold text-lg text-tiby-ink">
            Detail Laporan
          </h2>

          <div className="max-h-200 overflow-y-auto pr-2 space-y-3">
            {history.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-2xl border border-gray-200">
                <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-tiby-muted">Belum ada riwayat.</p>
              </div>
            ) : (
              history.map((item) => {
                const style = getVerdictStyle(item.verdict);
                const Icon = style.icon;
                const date = new Date(item.submittedAt);

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs"
                  >
                    <div className="flex flex-col gap-2 mb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-tiby-ink font-semibold text-sm">
                          <CalendarDays className="w-3.5 h-3.5 text-tiby-muted" />
                          {formatShortDate(date)}
                        </div>
                        <div
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${style.bg} ${style.text} ${style.border}`}
                        >
                          <Icon className="w-3 h-3" /> {style.label}
                        </div>
                      </div>
                      <span className="text-[11px] text-tiby-muted bg-gray-50 w-fit px-1.5 py-0.5 rounded">
                        {formatTime(date)}{" "}
                        WIB
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 border border-gray-100">
                        <Pill className="w-3.5 h-3.5 text-tiby-teal-700 shrink-0" />
                        <p className="text-xs font-medium text-tiby-ink truncate">
                          {item.medicationStatus === "SUDAH_MINUM"
                            ? `${item.pillsTakenCount} Butir (Sudah)`
                            : "Belum Minum"}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 border border-gray-100">
                        <Activity className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        <p className="text-xs font-medium text-tiby-ink truncate">
                          Metode:{" "}
                          {item.inputMode === "VOICE_STT" ? "Suara" : "Manual"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
