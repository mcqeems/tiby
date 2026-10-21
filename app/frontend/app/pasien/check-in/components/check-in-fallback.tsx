"use client";

import { useState } from "react";
import { Pill, Frown, CheckCircle2 } from "lucide-react";
import type { FallbackButtonsPayload } from "@/lib/types/check-in";

interface CheckInFallbackProps {
  onSubmit: (data: FallbackButtonsPayload) => void;
}

const SYMPTOMS = ["Mual", "Pusing", "Gatal", "Sesak Napas", "Nyeri Sendi"];

export default function CheckInFallback({ onSubmit }: CheckInFallbackProps) {
  const [hasComplaints, setHasComplaints] = useState(false);
  const [complaints, setComplaints] = useState<string[]>([]);

  const handleToggleSymptom = (s: string) => {
    setComplaints((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  };

  // Default jumlah pil (bisa disesuaikan dengan data regimen pasien jika ada)
  const DEFAULT_PILLS = 4;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h2 className="font-heading text-lg font-semibold text-tiby-ink">
          Pilih Kondisimu
        </h2>
        <p className="text-xs text-tiby-muted">
          Gunakan tombol di bawah ini dengan jujur.
        </p>
      </div>

      <div className="grid gap-3">
        {/* Tombol 1: Sudah Minum, Tanpa Keluhan */}
        <button
          onClick={() =>
            onSubmit({
              medicationStatus: "SUDAH_MINUM",
              pillsTakenCount: DEFAULT_PILLS,
              hasComplaints: false,
              selectedComplaints: [],
            })
          }
          className="flex items-center gap-4 p-4 rounded-2xl border-2 border-tiby-teal-100 bg-tiby-teal-50 hover:border-tiby-teal-600 text-left transition-all hover:shadow-md"
        >
          <CheckCircle2 className="w-8 h-8 text-tiby-teal-600" />
          <div>
            <p className="font-bold text-tiby-ink">Sudah Minum Obat</p>
            <p className="text-xs text-tiby-muted">Tanpa keluhan</p>
          </div>
        </button>

        {/* Tombol 2: Sudah Minum, Ada Keluhan */}
        <button
          onClick={() => setHasComplaints(!hasComplaints)}
          className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
            hasComplaints
              ? "border-amber-500 bg-amber-50 shadow-md"
              : "border-amber-100 bg-white hover:border-amber-300"
          }`}
        >
          <Frown
            className={`w-8 h-8 ${hasComplaints ? "text-amber-600" : "text-amber-400"}`}
          />
          <div>
            <p className="font-bold text-tiby-ink">Sudah Minum, Ada Keluhan</p>
            <p className="text-xs text-tiby-muted">Laporkan efek samping</p>
          </div>
        </button>

        {/* Tombol 3: Belum Minum */}
        <button
          onClick={() =>
            onSubmit({
              medicationStatus: "BELUM_MINUM",
              pillsTakenCount: 0,
              hasComplaints: false,
              selectedComplaints: [],
            })
          }
          className="flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-200 bg-white hover:border-gray-400 text-left transition-all hover:shadow-md"
        >
          <Pill className="w-8 h-8 text-gray-500" />
          <div>
            <p className="font-bold text-tiby-ink">Belum Minum Obat</p>
            <p className="text-xs text-tiby-muted">Belum sempat / lupa</p>
          </div>
        </button>
      </div>

      {/* Panel Keluhan (Muncul jika Tombol 2 diklik) */}
      {hasComplaints && (
        <div className="bg-amber-50 p-4 rounded-xl space-y-4 animate-in fade-in slide-in-from-top-2 border border-amber-100">
          <p className="text-xs font-semibold text-amber-800">
            Pilih keluhan yang dirasakan:
          </p>
          <div className="flex flex-wrap gap-2">
            {SYMPTOMS.map((s) => (
              <button
                key={s}
                onClick={() => handleToggleSymptom(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                  complaints.includes(s)
                    ? "bg-amber-600 text-white border-amber-600"
                    : "bg-white text-amber-800 border-amber-200 hover:border-amber-400"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <button
            onClick={() =>
              onSubmit({
                medicationStatus: "SUDAH_MINUM",
                pillsTakenCount: DEFAULT_PILLS,
                hasComplaints: true,
                selectedComplaints: complaints,
              })
            }
            className="w-full mt-2 h-10 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 transition"
          >
            Kirim Laporan Keluhan
          </button>
        </div>
      )}
    </div>
  );
}
