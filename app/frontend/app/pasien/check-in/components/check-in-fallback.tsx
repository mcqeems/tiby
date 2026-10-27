"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Pill,
  Frown,
  CheckCircle2,
  ChevronLeft,
  Check,
  Mic,
} from "lucide-react";
import type { FallbackButtonsPayload } from "@/lib/types/check-in";

interface CheckInFallbackProps {
  onBackToVoice: () => void;
  onSubmit: (data: FallbackButtonsPayload) => void;
}

const SYMPTOMS = ["Mual", "Pusing", "Gatal", "Sesak Napas", "Nyeri Sendi"];
const DEFAULT_PILLS = 4;

export default function CheckInFallback({
  onBackToVoice,
  onSubmit,
}: CheckInFallbackProps) {
  const [step, setStep] = useState(1);
  const [medStatus, setMedStatus] = useState<
    "SUDAH_MINUM" | "BELUM_MINUM" | null
  >(null);
  const [hasComplaints, setHasComplaints] = useState<boolean | null>(null);
  const [complaints, setComplaints] = useState<string[]>([]);

  const handleToggleSymptom = (s: string) => {
    setComplaints((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  };

  const handleFinalSubmit = () => {
    if (!medStatus) return;
    onSubmit({
      medicationStatus: medStatus,
      pillsTakenCount: medStatus === "SUDAH_MINUM" ? DEFAULT_PILLS : 0,
      hasComplaints: hasComplaints || false,
      selectedComplaints: complaints,
    });
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xl w-full max-w-md mx-auto">
      <div className="flex items-center mb-6">
        {step > 1 ? (
          <button
            onClick={() => setStep(step - 1)}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-500 transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        ) : (
          <div className="w-9" />
        )}
        <h2 className="font-heading text-lg font-bold text-tiby-ink text-center flex-1">
          Lapor Manual
        </h2>
        <div className="w-9" />
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <p className="text-sm text-tiby-muted text-center mb-6">
              Apakah kamu sudah minum obat hari ini?
            </p>
            <button
              onClick={() => {
                setMedStatus("SUDAH_MINUM");
                setStep(2);
              }}
              className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-tiby-teal-100 bg-tiby-teal-50 hover:border-tiby-teal-600 hover:shadow-md transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm text-tiby-teal-600 group-hover:scale-110 transition">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="text-left">
                <p className="font-bold text-tiby-ink text-lg">Sudah Minum</p>
                <p className="text-xs text-tiby-muted">
                  Aku sudah minum obat pagi ini
                </p>
              </div>
            </button>

            <button
              onClick={() => {
                setMedStatus("BELUM_MINUM");
                onSubmit({
                  medicationStatus: "BELUM_MINUM",
                  pillsTakenCount: 0,
                  hasComplaints: false,
                  selectedComplaints: [],
                });
              }}
              className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-gray-200 hover:border-gray-400 hover:shadow-md transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 group-hover:scale-110 transition">
                <Pill className="w-6 h-6" />
              </div>
              <div className="text-left">
                <p className="font-bold text-tiby-ink text-lg">Belum Minum</p>
                <p className="text-xs text-tiby-muted">
                  Belum sempat atau lupa
                </p>
              </div>
            </button>

            <div className="pt-4 mt-2 border-t border-gray-100">
              <button
                onClick={onBackToVoice}
                className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-tiby-teal-600 hover:text-tiby-teal-700 hover:bg-tiby-teal-50 rounded-xl transition"
              >
                <Mic className="w-4 h-4" /> Kembali ke Rekam Suara
              </button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <p className="text-sm text-tiby-muted text-center mb-6">
              Apakah ada keluhan atau efek samping?
            </p>
            <button
              onClick={() => {
                setHasComplaints(true);
                setStep(3);
              }}
              className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-amber-100 bg-amber-50 hover:border-amber-500 hover:shadow-md transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm text-amber-600 group-hover:scale-110 transition">
                <Frown className="w-6 h-6" />
              </div>
              <div className="text-left">
                <p className="font-bold text-tiby-ink text-lg">
                  Ya, Ada Keluhan
                </p>
                <p className="text-xs text-tiby-muted">
                  Mual, pusing, atau efek samping lain
                </p>
              </div>
            </button>

            <button
              onClick={() => {
                setHasComplaints(false);
                onSubmit({
                  medicationStatus: "SUDAH_MINUM",
                  pillsTakenCount: DEFAULT_PILLS,
                  hasComplaints: false,
                  selectedComplaints: [],
                });
              }}
              className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-emerald-100 bg-white hover:border-emerald-500 hover:shadow-md transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="text-left">
                <p className="font-bold text-tiby-ink text-lg">
                  Tidak Ada Keluhan
                </p>
                <p className="text-xs text-tiby-muted">
                  Badan terasa baik-baik saja
                </p>
              </div>
            </button>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-5"
          >
            <p className="text-sm text-tiby-muted text-center">
              Pilih keluhan yang dirasakan (bisa lebih dari satu):
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SYMPTOMS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleToggleSymptom(s)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                    complaints.includes(s)
                      ? "bg-amber-500 text-white border-amber-500 shadow-md scale-105"
                      : "bg-white text-gray-600 border-gray-200 hover:border-amber-300"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <button
              onClick={handleFinalSubmit}
              disabled={complaints.length === 0}
              className="w-full h-12 mt-4 bg-tiby-teal-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-tiby-teal-700 transition disabled:opacity-50"
            >
              <Check className="w-5 h-5" /> Kirim Laporan
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
