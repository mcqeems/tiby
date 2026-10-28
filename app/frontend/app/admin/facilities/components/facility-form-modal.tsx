"use client";

import { useState } from "react";
import { facilitiesApi } from "@/lib/api/facilities";
import type { CreateFacilityDto, FacilityItem } from "@/lib/types/facilities";
import { usePopup } from "@/components/ui/popup-provider";
import Dialog from "@/components/ui/dialog";
import { Loader2, Save } from "lucide-react";

const inputCls =
  "w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:ring-2 focus:ring-tiby-teal-600 outline-none";

export default function FacilityFormModal({
  facility,
  onClose,
  onSuccess,
}: {
  facility?: FacilityItem | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { notify } = usePopup();
  const isEdit = Boolean(facility);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<CreateFacilityDto>({
    code: facility?.code || "",
    name: facility?.name || "",
    district: facility?.district || "",
    emergencyPhone: facility?.emergencyPhone || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name.trim().length < 3 || formData.code.trim().length < 2) {
      return notify({
        variant: "warning",
        title: "Validasi Gagal",
        description: "Nama minimal 3 karakter dan kode minimal 2 karakter.",
        confirmLabel: "Mengerti",
      });
    }

    try {
      setSubmitting(true);
      if (facility) {
        await facilitiesApi.update(facility.id, formData);
      } else {
        await facilitiesApi.create(formData);
      }
      await notify({
        variant: "success",
        title: "Berhasil",
        description: isEdit
          ? "Data faskes diperbarui."
          : "Faskes baru ditambahkan.",
        confirmLabel: "Tutup",
      });
      onSuccess();
    } catch (err: unknown) {
      await notify({
        variant: "danger",
        title: "Gagal",
        description:
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan pada server.",
        confirmLabel: "Tutup",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={isEdit ? "Edit Data Faskes" : "Tambah Faskes Baru"}
      description="Data ini dipakai untuk penempatan Nakes dan akun faskes."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-tiby-ink">
              Kode Faskes
            </label>
            <input
              value={formData.code}
              onChange={(e) =>
                setFormData({ ...formData, code: e.target.value })
              }
              className={inputCls}
              placeholder="Contoh: PUSK-001"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-tiby-ink">
              Nama Faskes
            </label>
            <input
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className={inputCls}
              placeholder="Contoh: Puskesmas Gambir"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-tiby-ink">
            Kecamatan / Wilayah
          </label>
          <input
            value={formData.district}
            onChange={(e) =>
              setFormData({ ...formData, district: e.target.value })
            }
            className={inputCls}
            placeholder="Contoh: Jakarta Pusat"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-tiby-ink">
            Nomor Telepon Darurat
          </label>
          <input
            value={formData.emergencyPhone}
            onChange={(e) =>
              setFormData({ ...formData, emergencyPhone: e.target.value })
            }
            className={inputCls}
            placeholder="Contoh: 0811-2233-4455"
          />
        </div>

        <div className="flex gap-3 border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="h-11 flex-1 rounded-xl border border-gray-200 text-xs font-semibold hover:bg-gray-50"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-tiby-teal-600 text-xs font-semibold text-white hover:bg-tiby-teal-700 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {submitting ? "Menyimpan..." : "Simpan Data"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
