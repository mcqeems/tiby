"use client";

import { useState, useEffect, useCallback } from "react";
import { facilitiesApi } from "@/lib/api/facilities";
import type { FacilityItem, CreateFacilityDto } from "@/lib/types/facilities";
import { usePopup } from "@/components/ui/popup-provider";
import PublicLoading from "@/components/ui/public-loading";
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  X,
  Loader2,
  Save,
  MapPin,
  Phone,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const LIMIT = 12;

export default function FacilityManager() {
  const { notify, confirm } = usePopup();
  const [facilities, setFacilities] = useState<FacilityItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State (Disesuaikan dengan API Contract baru)
  const [formData, setFormData] = useState<CreateFacilityDto>({
    code: "",
    name: "",
    district: "",
    emergencyPhone: "",
  });

  const fetchFacilities = useCallback(async () => {
    setLoading(true);
    try {
      const res = await facilitiesApi.list({ page, limit: LIMIT });
      setFacilities(res.items || []);
      setTotal(res.total || 0);
    } catch {
      await notify({
        variant: "danger",
        title: "Gagal",
        description: "Tidak dapat memuat data faskes.",
        confirmLabel: "Tutup",
      });
    } finally {
      setLoading(false);
    }
  }, [notify, page]);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (active) fetchFacilities();
    }, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [fetchFacilities]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      code: "",
      name: "",
      district: "",
      emergencyPhone: "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (facility: FacilityItem) => {
    setEditingId(facility.id);
    setFormData({
      code: facility.code || "",
      name: facility.name || "",
      district: facility.district || "",
      emergencyPhone: facility.emergencyPhone || "",
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    const isConfirmed = await confirm({
      variant: "danger",
      title: "Hapus Fasilitas Kesehatan?",
      description: `Data ${name} akan dihapus permanen.`,
      confirmLabel: "Ya, Hapus",
      cancelLabel: "Batal",
    });

    if (!isConfirmed) return;

    try {
      await facilitiesApi.remove(id);
      await notify({
        variant: "success",
        title: "Terhapus",
        description: "Data faskes berhasil dihapus.",
        confirmLabel: "Tutup",
      });
      fetchFacilities();
    } catch {
      await notify({
        variant: "danger",
        title: "Gagal",
        description: "Tidak dapat menghapus faskes.",
        confirmLabel: "Tutup",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name.length < 3 || formData.code.length < 2) {
      return notify({
        variant: "warning",
        title: "Validasi Gagal",
        description: "Nama dan Kode Faskes minimal 3 karakter.",
        confirmLabel: "Mengerti",
      });
    }

    try {
      setSubmitting(true);
      if (editingId) {
        await facilitiesApi.update(editingId, formData);
        await notify({
          variant: "success",
          title: "Berhasil",
          description: "Data faskes diperbarui.",
          confirmLabel: "Tutup",
        });
      } else {
        await facilitiesApi.create(formData);
        await notify({
          variant: "success",
          title: "Berhasil",
          description: "Faskes baru ditambahkan.",
          confirmLabel: "Tutup",
        });
      }
      setIsModalOpen(false);
      fetchFacilities();
    } catch {
      await notify({
        variant: "danger",
        title: "Gagal",
        description: "Terjadi kesalahan pada server.",
        confirmLabel: "Tutup",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && facilities.length === 0)
    return <PublicLoading message="Memuat data faskes..." />;

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-heading font-bold text-tiby-ink">
            Master Fasilitas Kesehatan
          </h1>
          <p className="text-sm text-tiby-muted">
            Kelola data Puskesmas dan Klinik.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-tiby-teal-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-tiby-teal-700 transition"
        >
          <Plus className="w-4 h-4" />
          Tambah Faskes
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {facilities.length === 0 ? (
          <div className="col-span-full text-center py-16 bg-white rounded-2xl border border-gray-200">
            <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-tiby-muted">
              Belum ada data faskes yang ditambahkan.
            </p>
          </div>
        ) : (
          facilities.map((facility) => (
            <div
              key={facility.id}
              className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs hover:border-tiby-teal-200 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-tiby-teal-50 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-tiby-teal-700" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-base text-tiby-ink line-clamp-1">
                      {facility.name || "Tanpa Nama"}
                    </h3>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-gray-100 text-[10px] font-bold uppercase tracking-wider text-gray-600">
                      {facility.code || "-"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-xs text-tiby-muted mt-4 border-t border-gray-100 pt-4">
                <p className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5" /> {facility.district || "-"}
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5" />{" "}
                  {facility.emergencyPhone || "-"}
                </p>
              </div>

              <div className="flex gap-2 mt-5">
                <button
                  onClick={() => handleOpenEdit(facility)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-tiby-ink hover:bg-gray-50 transition"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  onClick={() =>
                    handleDelete(facility.id, facility.name || "ini")
                  }
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Hapus
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {total > 0 && (
        <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-5 py-3">
          <span className="text-xs text-tiby-muted">
            Menampilkan <strong>{(page - 1) * LIMIT + 1}</strong> -{" "}
            <strong>{Math.min(page * LIMIT, total)}</strong> dari{" "}
            <strong>{total}</strong> data
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="p-1.5 rounded-lg border border-gray-200 bg-white text-tiby-ink disabled:opacity-50 hover:bg-gray-50 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium text-tiby-ink px-2">
              Hal {page} / {totalPages || 1}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="p-1.5 rounded-lg border border-gray-200 bg-white text-tiby-ink disabled:opacity-50 hover:bg-gray-50 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* MODAL FORM */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-xl overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50/50 shrink-0">
              <h3 className="font-heading font-bold text-tiby-ink">
                {editingId ? "Edit Data Faskes" : "Tambah Faskes Baru"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:bg-gray-200 p-1.5 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-6 overflow-y-auto space-y-4"
            >
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-tiby-ink mb-1.5">
                    Kode Faskes
                  </label>
                  <input
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value })
                    }
                    className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:ring-2 focus:ring-tiby-teal-600 outline-none"
                    placeholder="Contoh: PUSK-001"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-tiby-ink mb-1.5">
                    Nama Faskes
                  </label>
                  <input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:ring-2 focus:ring-tiby-teal-600 outline-none"
                    placeholder="Contoh: Puskesmas Gambir"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-tiby-ink mb-1.5">
                  Kecamatan / Wilayah (District)
                </label>
                <input
                  value={formData.district}
                  onChange={(e) =>
                    setFormData({ ...formData, district: e.target.value })
                  }
                  className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:ring-2 focus:ring-tiby-teal-600 outline-none"
                  placeholder="Contoh: Jakarta Pusat"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-tiby-ink mb-1.5">
                  Nomor Telepon Darurat
                </label>
                <input
                  value={formData.emergencyPhone}
                  onChange={(e) =>
                    setFormData({ ...formData, emergencyPhone: e.target.value })
                  }
                  className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:ring-2 focus:ring-tiby-teal-600 outline-none"
                  placeholder="Contoh: 0811-2233-4455"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 h-11 rounded-xl border border-gray-200 text-xs font-semibold hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 h-11 rounded-xl bg-tiby-teal-600 text-white text-xs font-semibold hover:bg-tiby-teal-700 flex justify-center items-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {submitting ? "Menyimpan..." : "Simpan Data"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
