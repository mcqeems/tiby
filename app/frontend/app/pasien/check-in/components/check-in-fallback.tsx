"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Pill,
  Frown,
  CheckCircle2,
  ChevronLeft,
  Check,
  Mic,
  Minus,
  Plus,
} from "lucide-react";
import type { FallbackButtonsPayload } from "@/lib/types/check-in";
import {
  COMPLAINT_GROUPS,
  MAX_CUSTOM_COMPLAINT_LENGTH,
  complaintLabel,
} from "../lib/complaints";

interface CheckInFallbackProps {
  onBackToVoice: () => void;
  onSubmit: (data: FallbackButtonsPayload) => void;
}

const DEFAULT_PILLS = 4;
const MAX_PILLS = 12;
const TOTAL_STEPS = 5;

export default function CheckInFallback({
  onBackToVoice,
  onSubmit,
}: CheckInFallbackProps) {
  const [step, setStep] = useState(1);
  const [medStatus, setMedStatus] = useState<
    "SUDAH_MINUM" | "BELUM_MINUM" | null
  >(null);
  const [pills, setPills] = useState(DEFAULT_PILLS);
  const [hasComplaints, setHasComplaints] = useState<boolean | null>(null);
  const [complaints, setComplaints] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState("");

  const selectedLabels = useMemo(
    () => complaints.map((value) => complaintLabel(value)),
    [complaints],
  );

  const toggleComplaint = (value: string) => {
    setComplaints((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value],
    );
  };

  const addCustomComplaint = () => {
    const value = customInput.trim();
    if (!value) return;
    setComplaints((prev) =>
      prev.some((item) => item.toLowerCase() === value.toLowerCase())
        ? prev
        : [...prev, value],
    );
    setCustomInput("");
  };

  const handleSubmit = () => {
    if (!medStatus) return;
    onSubmit({
      medicationStatus: medStatus,
      pillsTakenCount: medStatus === "SUDAH_MINUM" ? pills : 0,
      hasComplaints: hasComplaints === true || complaints.length > 0,
      selectedComplaints: complaints,
    });
  };

  return (
    <div className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-6 shadow-xl">
      <div className="mb-6 flex items-center">
        {step > 1 ? (
          <button
            onClick={() => setStep(step - 1)}
            aria-label="Kembali ke langkah sebelumnya"
            className="-ml-2 rounded-full p-2 text-gray-500 transition hover:bg-gray-100"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        ) : (
          <div className="w-9" />
        )}
        <div className="flex-1 text-center">
          <h2 className="font-heading text-lg font-bold text-tiby-ink">
            Lapor Manual
          </h2>
          <p className="text-[11px] text-tiby-muted">
            Langkah {step} dari {TOTAL_STEPS}
          </p>
        </div>
        <div className="w-9" />
      </div>

      {/* Progress */}
      <div className="mb-6 grid grid-cols-5 gap-1" aria-hidden="true">
        {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
          <span
            key={index}
            className={`h-1.5 rounded-full transition-colors ${
              index < step ? "bg-tiby-teal-600" : "bg-gray-200"
            }`}
          />
        ))}
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
            <p className="mb-6 text-center text-sm text-tiby-muted">
              Apakah kamu sudah minum obat hari ini?
            </p>
            <button
              onClick={() => {
                setMedStatus("SUDAH_MINUM");
                setPills((value) => (value < 1 ? DEFAULT_PILLS : value));
                setStep(2);
              }}
              className="group flex w-full items-center gap-4 rounded-2xl border-2 border-tiby-teal-100 bg-tiby-teal-50 p-5 transition-all hover:border-tiby-teal-600 hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-tiby-teal-600 shadow-sm transition group-hover:scale-110">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="text-left">
                <p className="text-lg font-bold text-tiby-ink">Sudah Minum</p>
                <p className="text-xs text-tiby-muted">
                  Aku sudah minum obat hari ini
                </p>
              </div>
            </button>

            <button
              onClick={() => {
                setMedStatus("BELUM_MINUM");
                setPills(0);
                setStep(3);
              }}
              className="group flex w-full items-center gap-4 rounded-2xl border-2 border-gray-200 p-5 transition-all hover:border-gray-400 hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition group-hover:scale-110">
                <Pill className="h-6 w-6" />
              </div>
              <div className="text-left">
                <p className="text-lg font-bold text-tiby-ink">Belum Minum</p>
                <p className="text-xs text-tiby-muted">
                  Belum sempat atau lupa
                </p>
              </div>
            </button>

            <div className="mt-2 border-t border-gray-100 pt-4">
              <button
                onClick={onBackToVoice}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-tiby-teal-600 transition hover:bg-tiby-teal-50 hover:text-tiby-teal-700"
              >
                <Mic className="h-4 w-4" /> Kembali ke Rekam Suara
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
            className="space-y-5"
          >
            <div className="text-center">
              <p className="text-sm text-tiby-muted">
                Berapa butir obat yang sudah diminum?
              </p>
              <p className="mt-1 text-[11px] text-tiby-muted">
                Sesuaikan dengan jumlah butir yang diresepkan faskes.
              </p>
            </div>

            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setPills((value) => Math.max(1, value - 1))}
                disabled={pills <= 1}
                aria-label="Kurangi butir"
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200 text-tiby-ink transition hover:bg-gray-50 disabled:opacity-40"
              >
                <Minus className="h-5 w-5" />
              </button>
              <div className="w-24 text-center">
                <p className="font-heading text-4xl font-bold text-tiby-ink">
                  {pills}
                </p>
                <p className="text-[11px] text-tiby-muted">butir</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setPills((value) => Math.min(MAX_PILLS, value + 1))
                }
                disabled={pills >= MAX_PILLS}
                aria-label="Tambah butir"
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200 text-tiby-ink transition hover:bg-gray-50 disabled:opacity-40"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>

            <input
              type="range"
              min={1}
              max={MAX_PILLS}
              value={pills}
              onChange={(e) => setPills(Number(e.target.value))}
              aria-label="Jumlah butir obat"
              className="w-full accent-tiby-teal-600"
            />

            <button
              onClick={() => setStep(3)}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-tiby-teal-600 font-semibold text-white transition hover:bg-tiby-teal-700"
            >
              Lanjut <Check className="h-5 w-5" />
            </button>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <p className="mb-6 text-center text-sm text-tiby-muted">
              Apakah ada keluhan atau efek samping?
            </p>
            <button
              onClick={() => {
                setHasComplaints(true);
                setStep(4);
              }}
              className="group flex w-full items-center gap-4 rounded-2xl border-2 border-amber-100 bg-amber-50 p-5 transition-all hover:border-amber-500 hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-amber-600 shadow-sm transition group-hover:scale-110">
                <Frown className="h-6 w-6" />
              </div>
              <div className="text-left">
                <p className="text-lg font-bold text-tiby-ink">
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
                setComplaints([]);
                setStep(5);
              }}
              className="group flex w-full items-center gap-4 rounded-2xl border-2 border-emerald-100 bg-white p-5 transition-all hover:border-emerald-500 hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 transition group-hover:scale-110">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="text-left">
                <p className="text-lg font-bold text-tiby-ink">
                  Tidak Ada Keluhan
                </p>
                <p className="text-xs text-tiby-muted">
                  Badan terasa baik-baik saja
                </p>
              </div>
            </button>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-5"
          >
            <p className="text-center text-sm text-tiby-muted">
              Pilih keluhan yang dirasakan, lalu tambahkan keluhan lain jika
              perlu.
            </p>

            <div className="max-h-[45vh] space-y-4 overflow-y-auto pr-1">
              {COMPLAINT_GROUPS.map((group) => (
                <div key={group.title}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-tiby-muted">
                    {group.title}
                  </p>
                  {group.description && (
                    <p className="mt-0.5 text-[10px] text-tiby-muted">
                      {group.description}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {group.items.map((item) => {
                      const selected = complaints.includes(item.value);
                      return (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => toggleComplaint(item.value)}
                          aria-pressed={selected}
                          className={`rounded-xl border-2 px-3 py-1.5 text-xs font-semibold transition-all ${
                            selected
                              ? "border-amber-500 bg-amber-500 text-white shadow-md"
                              : "border-gray-200 bg-white text-gray-600 hover:border-amber-300"
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div>
              <label
                htmlFor="custom-complaint"
                className="mb-1.5 block text-xs font-semibold text-tiby-ink"
              >
                Keluhan lain
              </label>
              <div className="flex gap-2">
                <input
                  id="custom-complaint"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomComplaint();
                    }
                  }}
                  maxLength={MAX_CUSTOM_COMPLAINT_LENGTH}
                  placeholder="Contoh: gatal di lengan"
                  className="h-10 flex-1 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:ring-2 focus:ring-tiby-teal-600"
                />
                <button
                  type="button"
                  onClick={addCustomComplaint}
                  disabled={!customInput.trim()}
                  className="rounded-xl bg-gray-100 px-3 text-xs font-semibold text-tiby-ink transition hover:bg-gray-200 disabled:opacity-40"
                >
                  Tambah
                </button>
              </div>
            </div>

            {complaints.length > 0 && (
              <div className="rounded-xl border border-tiby-teal-100 bg-tiby-teal-50/60 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-tiby-teal-700">
                  Keluhan terpilih
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedLabels.map((label) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-tiby-teal-700 ring-1 ring-tiby-teal-200"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setStep(5)}
              disabled={complaints.length === 0}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-tiby-teal-600 font-bold text-white transition hover:bg-tiby-teal-700 disabled:opacity-50"
            >
              <Check className="h-5 w-5" /> Lanjut ke Ringkasan
            </button>
          </motion.div>
        )}

        {step === 5 && (
          <motion.div
            key="step5"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-5"
          >
            <p className="text-center text-sm text-tiby-muted">
              Periksa kembali laporanmu sebelum dikirim.
            </p>

            <dl className="space-y-3 rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
              <div className="flex items-center justify-between gap-3 text-sm">
                <dt className="text-tiby-muted">Status minum obat</dt>
                <dd className="font-semibold text-tiby-ink">
                  {medStatus === "SUDAH_MINUM" ? "Sudah minum" : "Belum minum"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <dt className="text-tiby-muted">Jumlah butir</dt>
                <dd className="font-semibold text-tiby-ink">
                  {medStatus === "SUDAH_MINUM" ? `${pills} butir` : "0 butir"}
                </dd>
              </div>
              <div className="text-sm">
                <dt className="text-tiby-muted">Keluhan</dt>
                <dd className="mt-1.5">
                  {complaints.length === 0 ? (
                    <span className="font-semibold text-emerald-700">
                      Tidak ada keluhan
                    </span>
                  ) : (
                    <span className="flex flex-wrap gap-1.5">
                      {selectedLabels.map((label) => (
                        <span
                          key={label}
                          className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200"
                        >
                          {label}
                        </span>
                      ))}
                    </span>
                  )}
                </dd>
              </div>
            </dl>

            <button
              onClick={handleSubmit}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-tiby-teal-600 font-bold text-white transition hover:bg-tiby-teal-700"
            >
              <Check className="h-5 w-5" /> Kirim Laporan
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
