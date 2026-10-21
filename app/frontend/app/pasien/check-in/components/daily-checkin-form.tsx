"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { usePopup } from "@/components/ui/popup-provider";
import PublicLoading from "@/components/ui/public-loading";
import { CheckCircle2, AlertCircle, Send, Pill, Clock } from "lucide-react";

export default function DailyCheckinForm() {
  const { notify, confirm } = usePopup();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<
    "SUDAH_MINUM" | "BELUM_MINUM" | "TIDAK_PASTI"
  >("SUDAH_MINUM");
  const [pillsCount, setPillsCount] = useState<number>(4);
  const [hasComplaints, setHasComplaints] = useState<boolean>(false);
  const [sideEffects, setSideEffects] = useState("");
  const [treatmentPlanId, setTreatmentPlanId] = useState("");
  const [successSubmitted, setSuccessSubmitted] = useState(false);

  const handleCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Cek status consent terlebih dahulu menggunakan method yang benar (getStatus)
      try {
        const consent = await api.consent.getStatus();
        if (consent.mustConfirmConsent || !consent.active) {
          const agreed = await confirm({
            variant: "warning",
            badgeText: "Persetujuan Klinis",
            title: "Konfirmasi Persetujuan Terapi Tiby",
            description:
              "Sebelum melakukan check-in, Anda perlu menyetujui pembagian data medis untuk pemantauan PMO dan Nakes.",
            confirmLabel: "Setujui & Lanjutkan",
            cancelLabel: "Batal",
          });

          if (!agreed) {
            setLoading(false);
            return;
          }

          // Memanggil grant sesuai definisi parameter (scopes sebagai array string dan scheduleConfirmed)
          await api.consent.grant(
            ["PATIENT_DATA_SHARE", "PMO_STATUS_ONLY", "STT_AUDIO_PROCESSING"],
            true,
          );
        }
      } catch {
        // Jika gagal mengecek status consent, abaikan atau lanjutkan ke submit check-in
      }

      // 2. Kirim Check-in
      await api.checkIns.submit({
        inputMode: "FALLBACK_BUTTONS",
        treatmentPlanId: treatmentPlanId.trim()
          ? treatmentPlanId.trim()
          : undefined,
        fallbackButtons: {
          medicationStatus: status,
          pillsTakenCount: pillsCount,
          hasComplaints: hasComplaints,
          selectedComplaints: sideEffects ? [sideEffects] : [],
        },
      });

      setSuccessSubmitted(true);
      await notify({
        variant: "success",
        badgeText: "Check-in Berhasil",
        title: "Kepatuhan Hari Ini Tercatat",
        description:
          "Terima kasih telah disiplin meminum obat. PMO dan Nakes Anda telah mendapatkan pembaruan status.",
        confirmLabel: "Tutup",
      });
    } catch (err: unknown) {
      await notify({
        variant: "danger",
        badgeText: "Gagal",
        title: "Check-in Gagal Disimpan",
        description:
          err instanceof Error
            ? err.message
            : "Terjadi kendala saat menyimpan check-in. Pastikan pasien memiliki rencana terapi aktif.",
        confirmLabel: "Mengerti",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <PublicLoading message="Memproses persetujuan dan laporan harian..." />
    );
  }

  if (successSubmitted) {
    return (
      <div className="rounded-3xl border border-teal-200 bg-tiby-teal-50/70 p-8 text-center space-y-3">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-tiby-teal-600 text-white shadow-xs">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h3 className="font-heading text-lg font-semibold text-tiby-teal-800">
          Laporan Hari Ini Telah Selesai
        </h3>
        <p className="text-xs text-tiby-muted max-w-sm mx-auto">
          Status Anda tercatat aman. Tetap jaga kesehatan dan lanjutkan semangat
          pemulihannya!
        </p>
        <button
          type="button"
          onClick={() => setSuccessSubmitted(false)}
          className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-tiby-teal-200 bg-white px-4 py-2 text-xs font-semibold text-tiby-teal-700 hover:bg-tiby-teal-50 transition cursor-pointer"
        >
          <span>Ubah Laporan</span>
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleCheckin}
      className="rounded-3xl border border-tiby-teal-100 bg-white p-6 shadow-xs space-y-5"
    >
      <div className="flex items-center gap-3 border-b border-tiby-teal-100/60 pb-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-tiby-teal-50 text-tiby-teal-700">
          <Pill className="w-5 h-5" />
        </span>
        <div>
          <span className="text-[11px] font-semibold text-tiby-teal-700 block">
            Pelaporan Mandiri
          </span>
          <h3 className="font-heading text-base font-semibold text-tiby-ink">
            Check-in Minum Obat Hari Ini
          </h3>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-tiby-ink">
          ID Rencana Terapi (Opsional / Kosongkan jika sudah di-onboard Nakes)
        </label>
        <input
          type="text"
          value={treatmentPlanId}
          onChange={(e) => setTreatmentPlanId(e.target.value)}
          placeholder="cth: bb1adaae-b7fc-4621-9bdb-26948c44406a"
          className="w-full rounded-xl border border-tiby-teal-100 px-3.5 py-2.5 text-xs font-mono text-tiby-ink focus:outline-none focus:ring-2 focus:ring-tiby-teal-600"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-medium text-tiby-ink">
          Status Minum Obat *
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setStatus("SUDAH_MINUM")}
            className={`flex items-center justify-center gap-2 rounded-2xl border p-3.5 text-xs font-semibold transition cursor-pointer ${
              status === "SUDAH_MINUM"
                ? "border-tiby-teal-600 bg-tiby-teal-50 text-tiby-teal-700 shadow-2xs"
                : "border-tiby-teal-100 bg-white text-tiby-muted hover:bg-gray-50"
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span>Sudah Diminum</span>
          </button>

          <button
            type="button"
            onClick={() => setStatus("TIDAK_PASTI")}
            className={`flex items-center justify-center gap-2 rounded-2xl border p-3.5 text-xs font-semibold transition cursor-pointer ${
              status === "TIDAK_PASTI"
                ? "border-amber-500 bg-amber-50 text-amber-800 shadow-2xs"
                : "border-tiby-teal-100 bg-white text-tiby-muted hover:bg-gray-50"
            }`}
          >
            <Clock className="w-4 h-4 text-amber-600" />
            <span>Minum Terlambat</span>
          </button>

          <button
            type="button"
            onClick={() => setStatus("BELUM_MINUM")}
            className={`flex items-center justify-center gap-2 rounded-2xl border p-3.5 text-xs font-semibold transition cursor-pointer ${
              status === "BELUM_MINUM"
                ? "border-red-500 bg-red-50 text-red-700 shadow-2xs"
                : "border-tiby-teal-100 bg-white text-tiby-muted hover:bg-gray-50"
            }`}
          >
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span>Terlewat / Belum</span>
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-tiby-ink">
          Jumlah Butir Obat yang Diminum *
        </label>
        <input
          type="number"
          min={1}
          max={12}
          value={pillsCount}
          onChange={(e) => setPillsCount(parseInt(e.target.value, 10) || 1)}
          className="w-full rounded-xl border border-tiby-teal-100 px-3.5 py-2.5 text-xs text-tiby-ink focus:outline-none focus:ring-2 focus:ring-tiby-teal-600"
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-tiby-ink">
          Keluhan atau Efek Samping (Opsional)
        </label>
        <input
          type="text"
          value={sideEffects}
          onChange={(e) => {
            setSideEffects(e.target.value);
            setHasComplaints(Boolean(e.target.value));
          }}
          placeholder="cth: Mual ringan setelah minum obat"
          className="w-full rounded-xl border border-tiby-teal-100 px-3.5 py-2.5 text-xs text-tiby-ink focus:outline-none focus:ring-2 focus:ring-tiby-teal-600"
        />
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-xl bg-tiby-teal-600 px-6 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-tiby-teal-700 transition cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Kirim Laporan Check-in</span>
        </button>
      </div>
    </form>
  );
}
