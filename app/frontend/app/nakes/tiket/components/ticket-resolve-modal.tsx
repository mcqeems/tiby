"use client";

import { useState } from "react";
import { ModalCard, ModalOverlay } from "@/components/ui/modal-frame";
import { faskesApi } from "@/lib/api/faskes";
import { usePopup } from "@/components/ui/popup-provider";
import type { FaskesTicket } from "@/lib/types/faskes";
import { X, CheckCircle2, Loader2, Save } from "lucide-react";

interface TicketResolveModalProps {
  ticket: FaskesTicket;
  onClose: () => void;
  onSuccess: () => void;
}

const RESOLUTION_REASONS = [
  { value: "KONSULTASI_KLINIK", label: "Konsultasi Klinik / Faskes" },
  { value: "KUNJUNGAN_RUMAH", label: "Kunjungan Rumah (Home Visit)" },
  { value: "PASIEN_DIHUBUNGI", label: "Pasien Berhasil Dihubungi" },
  { value: "PASIEN_PINDAH", label: "Pasien Pindah Domisili / Faskes" },
  { value: "LAINNYA", label: "Alasan Lainnya" },
];

export default function TicketResolveModal({
  ticket,
  onClose,
  onSuccess,
}: TicketResolveModalProps) {
  const { notify } = usePopup();

  const [reason, setReason] = useState("KONSULTASI_KLINIK");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // ✅ WAJIB: Mencegah form reload halaman

    if (notes.trim().length < 5) {
      return notify({
        variant: "warning",
        title: "Catatan Terlalu Pendek",
        description: "Mohon isi catatan tindak lanjut minimal 5 karakter.",
        confirmLabel: "Mengerti",
      });
    }

    try {
      setLoading(true);
      await faskesApi.closeTicket(ticket.id, {
        resolutionReason: reason,
        resolutionNotes: notes,
      });

      await notify({
        variant: "success",
        badgeText: "Tiket Selesai",
        title: "Tindak Lanjut Berhasil",
        description: "Tiket telah ditutup dan tindakan Anda telah tercatat.",
        confirmLabel: "Tutup",
      });

      onSuccess();
    } catch (err: unknown) {
      await notify({
        variant: "danger",
        title: "Gagal Menutup Tiket",
        description:
          err instanceof Error ? err.message : "Terjadi kesalahan pada server.",
        confirmLabel: "Tutup",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalOverlay label="Tindak Lanjut Pasien" onClose={onClose}>
      <ModalCard className="w-full max-w-lg rounded-3xl bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-tiby-teal-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-tiby-teal-700" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-tiby-ink">
                Tindak Lanjut Pasien
              </h3>
              <p className="text-xs text-tiby-muted">{ticket.patientName}</p>
            </div>
          </div>
          <button
            type="button" // ✅ Tambahkan type="button" agar tidak memicu submit form
            onClick={onClose}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-tiby-ink hover:bg-gray-100 rounded-full transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
            <p className="text-xs text-amber-800 font-semibold mb-1">
              Catatan Awal Sistem:
            </p>
            <p className="text-sm text-amber-900 italic">
              &ldquo;{ticket.pmoNotes || "Tidak ada catatan awal."}&rdquo;
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-tiby-ink mb-1.5">
              Bentuk Tindakan
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-tiby-ink focus:outline-none focus:ring-2 focus:ring-tiby-teal-600 cursor-pointer"
            >
              {RESOLUTION_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-tiby-ink mb-1.5">
              Catatan Tindak Lanjut (Hasil)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Pasien sudah dikunjungi ke rumah, kondisinya membaik dan berjanji akan rutin minum obat."
              className="w-full h-32 rounded-xl border border-gray-200 p-3 text-sm text-tiby-ink placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-tiby-teal-600 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button" // ✅ Tambahkan type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 h-12 rounded-xl border border-gray-200 text-tiby-ink font-semibold text-sm hover:bg-gray-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-12 rounded-xl bg-tiby-teal-600 text-white font-semibold text-sm hover:bg-tiby-teal-700 transition flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {loading ? "Menyimpan..." : "Simpan & Tutup Tiket"}
            </button>
          </div>
        </form>
      </ModalCard>
    </ModalOverlay>
  );
}
