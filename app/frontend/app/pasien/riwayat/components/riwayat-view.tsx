"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { checkInsApi } from "@/lib/api/check-in";
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
  Loader2,
  FileText,
} from "lucide-react";

const getLocalDateStr = (dateString: string) => {
  const d = new Date(dateString);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function calculateStreak(history: CheckInHistoryItem[]) {
  if (history.length === 0) return 0;

  const sorted = [...history].sort(
    (a, b) =>
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
  );

  if (!sorted[0].isDoseFulfilled) return 0;

  let streak = 0;
  const expectedDate = new Date(sorted[0].submittedAt);
  expectedDate.setHours(0, 0, 0, 0);

  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i];
    const itemDate = new Date(item.submittedAt);
    itemDate.setHours(0, 0, 0, 0);

    if (itemDate.getTime() === expectedDate.getTime() && item.isDoseFulfilled) {
      streak++;
      expectedDate.setDate(expectedDate.getDate() - 1);
    } else {
      break;
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const latestCheckIn = new Date(sorted[0].submittedAt);
  latestCheckIn.setHours(0, 0, 0, 0);

  const diffInDays = Math.floor(
    (today.getTime() - latestCheckIn.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffInDays > 1) return 0;

  return streak;
}

const getVerdictStyle = (verdict: string) => {
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function fetchHistory() {
      try {
        const res = await checkInsApi.getHistory({ limit: 50 });
        if (active) setHistory(res.items || []);
      } catch (err) {
        console.error("Gagal memuat riwayat:", err);
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchHistory();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-tiby-teal-600" />
      </div>
    );
  }

  const currentStreak = calculateStreak(history);

  const startDate =
    history.length > 0
      ? getLocalDateStr(
          [...history].sort(
            (a, b) =>
              new Date(a.submittedAt).getTime() -
              new Date(b.submittedAt).getTime(),
          )[0].submittedAt,
        )
      : undefined;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24 md:pb-10">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-tiby-ink">
          Riwayat Terapi
        </h1>
        <p className="mt-1 text-sm text-tiby-muted">
          Catatan perjalanan pengobatan dan laporan harian Anda.
        </p>
      </div>

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
            <p className="text-xs text-tiby-teal-100 mt-2 max-w-[200px]">
              {currentStreak > 0
                ? "Api semangatmu menyala! Pertahankan konsistensimu."
                : "Ayo lakukan check-in hari ini untuk menyalakan apimu kembali."}
            </p>
          </div>

          <div className="relative w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
            {currentStreak > 0 && (
              <motion.div
                className="absolute inset-0 bg-orange-500/40 rounded-full blur-xl"
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.4, 0.8, 0.4],
                }}
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
                    ? "text-orange-400 fill-orange-400 drop-shadow-[0_0_12px_rgba(249,115,22,0.8)]"
                    : "text-white/40 fill-white/10"
                }`}
              />
            </motion.div>
          </div>
        </div>
      </div>

      <TreatmentCalendar checkIns={history} startDate={startDate} />

      <div className="space-y-4">
        <h2 className="font-heading font-bold text-lg text-tiby-ink pt-2">
          Detail Laporan
        </h2>

        {history.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-2xl border border-gray-200">
            <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-tiby-muted">
              Belum ada riwayat check-in.
            </p>
          </div>
        ) : (
          history.map((item) => {
            const style = getVerdictStyle(item.verdict);
            const Icon = style.icon;
            const date = new Date(item.submittedAt);

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2 text-tiby-ink font-semibold">
                    <CalendarDays className="w-4 h-4 text-tiby-muted" />
                    {date.toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                    <span className="text-xs font-normal text-tiby-muted bg-gray-100 px-2 py-0.5 rounded-md">
                      {date.toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${style.bg} ${style.text} ${style.border}`}
                  >
                    <Icon className="w-3.5 h-3.5" /> {style.label}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <div className="w-8 h-8 rounded-lg bg-tiby-teal-100 flex items-center justify-center shrink-0">
                      <Pill className="w-4 h-4 text-tiby-teal-700" />
                    </div>
                    <div>
                      <p className="text-[10px] text-tiby-muted uppercase font-bold tracking-wider">
                        Status Obat
                      </p>
                      <p className="text-sm font-semibold text-tiby-ink">
                        {item.medicationStatus === "SUDAH_MINUM"
                          ? `${item.pillsTakenCount} Butir (Sudah)`
                          : "Belum Minum"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                      <Activity className="w-4 h-4 text-amber-700" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-tiby-muted uppercase font-bold tracking-wider">
                        Metode Lapor
                      </p>
                      <p className="text-sm font-semibold text-tiby-ink truncate">
                        {item.inputMode === "VOICE_STT"
                          ? "Suara (Pandu)"
                          : "Tombol Manual"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
