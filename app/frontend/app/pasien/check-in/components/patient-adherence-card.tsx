"use client";

import { CheckCircle2, Clock, AlertTriangle, ShieldCheck } from "lucide-react";

interface AdherenceCardProps {
  patientName: string;
  pmoName: string;
  streakDays: number;
  todayStatus: "SUDAH" | "TERLAMBAT" | "BELUM";
}

export default function PatientAdherenceCard({
  patientName,
  pmoName,
  streakDays,
  todayStatus,
}: AdherenceCardProps) {
  return (
    <div className="rounded-3xl border border-tiby-teal-100 bg-white p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-tiby-teal-50 text-tiby-teal-700">
          <ShieldCheck className="w-5 h-5" />
        </span>
        <div>
          <h4 className="font-heading text-sm font-semibold text-tiby-ink">
            {patientName}
          </h4>
          <p className="text-xs text-tiby-muted mt-0.5">
            Pengawas (PMO):{" "}
            <span className="font-medium text-tiby-ink">{pmoName}</span>
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-tiby-teal-50 border border-tiby-teal-100 px-2.5 py-0.5 text-[10px] font-semibold text-tiby-teal-700">
              🔥 Streak: {streakDays} Hari Patuh
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-center">
        {todayStatus === "SUDAH" && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200 px-3 py-1 text-xs font-semibold text-green-700">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Sudah Check-in</span>
          </span>
        )}
        {todayStatus === "TERLAMBAT" && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700">
            <Clock className="w-3.5 h-3.5" />
            <span>Terlambat</span>
          </span>
        )}
        {todayStatus === "BELUM" && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-200 px-3 py-1 text-xs font-semibold text-red-700">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Belum Laporan</span>
          </span>
        )}
      </div>
    </div>
  );
}
