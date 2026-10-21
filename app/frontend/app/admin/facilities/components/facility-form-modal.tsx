"use client";

import { useState } from "react";
import { api, type FacilityItem, type CreateFacilityDto } from "@/lib/api";
import { X, Building2, Check } from "lucide-react";

interface FacilityFormModalProps {
  initialData?: FacilityItem | null;
  onClose: () => void;
  onSuccess: (saved: FacilityItem) => void;
}

export default function FacilityFormModal({
  initialData,
  onClose,
  onSuccess,
}: FacilityFormModalProps) {
  const isEdit = !!initialData;

  const [form, setForm] = useState<CreateFacilityDto>({
    code: initialData?.code || "",
    name: initialData?.name || "",
    type: initialData?.type || "PUSKESMAS",
    province: initialData?.province || "",
    city: initialData?.city || "",
    address: initialData?.address || "",
    phone: initialData?.phone || "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const saved = isEdit
        ? await api.facilities.update(initialData.id, form)
        : await api.facilities.create(form);
      onSuccess(saved);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Gagal menyimpan data fasilitas kesehatan.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs px-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-tiby-teal-100 animate-fadeIn max-h-[90vh] flex flex-col">
        {/* Header Modal */}
        <div className="flex items-start justify-between pb-3 border-b border-tiby-teal-100">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-tiby-teal-50 text-tiby-teal-700">
              <Building2 className="w-5 h-5" />
            </span>
            <div>
              <span className="text-[10px] font-bold text-tiby-teal-600 uppercase tracking-wider block">
                Master Fasilitas Kesehatan
              </span>
              <h3 className="font-heading text-lg font-600 text-tiby-ink">
                {isEdit ? "Perbarui Data Fasilitas" : "Tambah Fasilitas Baru"}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-tiby-muted hover:bg-gray-100 cursor-pointer"
            aria-label="Tutup modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          className="overflow-y-auto py-4 space-y-4"
        >
          {errorMsg && (
            <div className="rounded-2xl border border-red-100 bg-tiby-danger p-3 text-xs text-tiby-danger-text flex justify-between items-center">
              <span>{errorMsg}</span>
              <button
                type="button"
                onClick={() => setErrorMsg(null)}
                className="font-bold cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-tiby-ink mb-1">
                Kode Faskes *
              </label>
              <input
                type="text"
                required
                value={form.code}
                onChange={(e) =>
                  setForm({ ...form, code: e.target.value.toUpperCase() })
                }
                placeholder="cth: PKM-JTS-01"
                className="w-full rounded-xl border border-tiby-teal-100 px-3.5 py-2 text-xs text-tiby-ink font-mono focus:outline-none focus:ring-2 focus:ring-tiby-teal-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-tiby-ink mb-1">
                Tipe Fasilitas *
              </label>
              <select
                value={form.type}
                onChange={(e) =>
                  setForm({
                    ...form,
                    type: e.target.value as CreateFacilityDto["type"],
                  })
                }
                className="w-full rounded-xl border border-tiby-teal-100 bg-white px-3 py-2 text-xs text-tiby-ink focus:outline-none focus:ring-2 focus:ring-tiby-teal-600"
              >
                <option value="PUSKESMAS">Puskesmas</option>
                <option value="RUMAH_SAKIT">Rumah Sakit</option>
                <option value="KLINIK">Klinik Pratama / Utama</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-tiby-ink mb-1">
              Nama Fasilitas Kesehatan *
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="cth: Puskesmas Jetis Ponorogo"
              className="w-full rounded-xl border border-tiby-teal-100 px-3.5 py-2 text-xs text-tiby-ink focus:outline-none focus:ring-2 focus:ring-tiby-teal-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-tiby-ink mb-1">
                Provinsi *
              </label>
              <input
                type="text"
                required
                value={form.province}
                onChange={(e) => setForm({ ...form, province: e.target.value })}
                placeholder="cth: Jawa Timur"
                className="w-full rounded-xl border border-tiby-teal-100 px-3.5 py-2 text-xs text-tiby-ink focus:outline-none focus:ring-2 focus:ring-tiby-teal-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-tiby-ink mb-1">
                Kota / Kabupaten *
              </label>
              <input
                type="text"
                required
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="cth: Kab. Ponorogo"
                className="w-full rounded-xl border border-tiby-teal-100 px-3.5 py-2 text-xs text-tiby-ink focus:outline-none focus:ring-2 focus:ring-tiby-teal-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-tiby-ink mb-1">
              Nomor Telepon / Kontak Faskes
            </label>
            <input
              type="tel"
              value={form.phone || ""}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="cth: 0352-123456"
              className="w-full rounded-xl border border-tiby-teal-100 px-3.5 py-2 text-xs text-tiby-ink focus:outline-none focus:ring-2 focus:ring-tiby-teal-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-tiby-ink mb-1">
              Alamat Lengkap
            </label>
            <textarea
              rows={2}
              value={form.address || ""}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Masukkan jalan, kecamatan, dan kode pos..."
              className="w-full rounded-xl border border-tiby-teal-100 px-3.5 py-2 text-xs text-tiby-ink focus:outline-none focus:ring-2 focus:ring-tiby-teal-600"
            />
          </div>

          {/* Footer Modal */}
          <div className="pt-3 border-t border-tiby-teal-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-tiby-teal-100 bg-white px-5 py-2 text-xs font-semibold text-tiby-muted hover:text-tiby-ink transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-full bg-tiby-teal-600 px-6 py-2 text-xs font-semibold text-white shadow-sm hover:bg-tiby-teal-700 transition disabled:opacity-50 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>
                {submitting
                  ? "Menyimpan..."
                  : isEdit
                    ? "Simpan Perubahan"
                    : "Tambah Fasilitas"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
