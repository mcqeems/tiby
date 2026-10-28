"use client";

import { useState } from "react";
import { ModalCard, ModalOverlay } from "@/components/ui/modal-frame";
import { pmoApi } from "@/lib/api/pmo";
import { usePopup } from "@/components/ui/popup-provider";
// ✅ Import LucideIcon untuk typing
import {
  X,
  PhoneCall,
  Home,
  MessageSquare,
  Loader2,
  Save,
  CalendarClock,
  Pill,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";

// Tipe spesifik sesuai backend
type PmoAction =
  | "MENGHUBUNGI_PASIEN"
  | "KUNJUNGAN_RUMAH"
  | "MENGHUBUNGI_KELUARGA"
  | "MENGANTAR_OBAT"
  | "EDUKASI_KONSULTASI"
  | "MENGINGATKAN_JADWAL_KONTROL"
  | "LAINNYA";

interface PmoFollowUpModalProps {
  patientId: string;
  patientName: string;
  onClose: () => void;
  onSuccess: () => void;
}

// ✅ FIX: Ganti 'any' menjadi 'LucideIcon'
const ACTIONS: { value: PmoAction; label: string; icon: LucideIcon }[] = [
  { value: "MENGHUBUNGI_PASIEN", label: "Menghubungi Pasien", icon: PhoneCall },
  {
    value: "KUNJUNGAN_RUMAH",
    label: "Kunjungan Rumah (Home Visit)",
    icon: Home,
  },
  {
    value: "MENGHUBUNGI_KELUARGA",
    label: "Menghubungi Keluarga",
    icon: MessageSquare,
  },
  {
    value: "MENGINGATKAN_JADWAL_KONTROL",
    label: "Mengingatkan Jadwal Kontrol",
    icon: CalendarClock,
  },
  { value: "MENGANTAR_OBAT", label: "Mengantar Obat", icon: Pill },
  {
    value: "EDUKASI_KONSULTASI",
    label: "Memberikan Edukasi",
    icon: HelpCircle,
  },
];

export default function PmoFollowUpModal({
  patientId,
  patientName,
  onClose,
  onSuccess,
}: PmoFollowUpModalProps) {
  const { notify } = usePopup();

  const [actionTaken, setActionTaken] =
    useState<PmoAction>("MENGHUBUNGI_PASIEN");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (notes.trim().length < 5) {
      return notify({
        variant: "warning",
        title: "Catatan Kurang",
        description: "Mohon isi catatan minimal 5 karakter.",
        confirmLabel: "Mengerti",
      });
    }

    try {
      setLoading(true);
      await pmoApi.createFollowUp(patientId, {
        actionTaken,
        notes,
      });

      await notify({
        variant: "success",
        badgeText: "Tindak Lanjut",
        title: "Berhasil Dicatat",
        description: "Laporan pendampinganmu sudah tersimpan.",
        confirmLabel: "Tutup",
      });

      onSuccess();
    } catch (err: unknown) {
      await notify({
        variant: "danger",
        title: "Gagal Menyimpan",
        description:
          err instanceof Error ? err.message : "Terjadi kesalahan pada server.",
        confirmLabel: "Tutup",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalOverlay label="Catat Tindak Lanjut" onClose={onClose}>
      <ModalCard className="w-full max-w-md max-h-[90vh] flex flex-col rounded-3xl bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50/50 shrink-0">
          <div>
            <h3 className="font-heading font-bold text-tiby-ink">
              Catat Tindak Lanjut
            </h3>
            <p className="text-xs text-tiby-muted">Pasien: {patientName}</p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-tiby-ink hover:bg-gray-200 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          <div>
            <label className="block text-sm font-semibold text-tiby-ink mb-2">
              Tindakan yang Dilakukan
            </label>
            <div className="space-y-2">
              {ACTIONS.map((action) => {
                const Icon = action.icon;
                const isSelected = actionTaken === action.value;
                return (
                  <label
                    key={action.value}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      isSelected
                        ? "border-tiby-teal-600 bg-tiby-teal-50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="actionTaken"
                      value={action.value}
                      checked={isSelected}
                      onChange={(e) =>
                        setActionTaken(e.target.value as PmoAction)
                      }
                      className="hidden"
                    />
                    <Icon
                      className={`w-5 h-5 ${isSelected ? "text-tiby-teal-700" : "text-gray-400"}`}
                    />
                    <span
                      className={`text-sm font-medium ${isSelected ? "text-tiby-teal-700" : "text-gray-600"}`}
                    >
                      {action.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-tiby-ink mb-1.5">
              Catatan Hasil
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Pasien sudah dihubungi dan berjanji akan minum obat sore ini."
              className="w-full h-24 rounded-xl border border-gray-200 p-3 text-sm text-tiby-ink placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-tiby-teal-600 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 h-11 rounded-xl border border-gray-200 text-tiby-ink font-semibold text-sm hover:bg-gray-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-11 rounded-xl bg-tiby-teal-600 text-white font-semibold text-sm hover:bg-tiby-teal-700 transition flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {loading ? "Menyimpan..." : "Simpan Catatan"}
            </button>
          </div>
        </form>
      </ModalCard>
    </ModalOverlay>
  );
}
