"use client";

import { useState, useEffect, useCallback } from "react";
import Pagination from "@/components/ui/pagination";
import { errorMessage } from "@/lib/errors";
import { SkeletonCards, SkeletonRegion } from "@/components/ui/skeleton";
import Link from "next/link";
import { facilitiesApi } from "@/lib/api/facilities";
import type { FacilityItem } from "@/lib/types/facilities";
import FacilityFormModal from "./facility-form-modal";
import { usePopup } from "@/components/ui/popup-provider";
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  MapPin,
  Phone,
  Search,
} from "lucide-react";

const LIMIT = 12;

export default function FacilityManager() {
  const { notify, confirm } = usePopup();
  const [facilities, setFacilities] = useState<FacilityItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editingFacility, setEditingFacility] = useState<FacilityItem | null>(
    null,
  );

  const fetchFacilities = useCallback(async () => {
    setLoading(true);
    try {
      const res = await facilitiesApi.list({
        page,
        limit: LIMIT,
        search: search.trim() || undefined,
      });
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
  }, [notify, page, search]);

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
    setEditingFacility(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (facility: FacilityItem) => {
    setEditingFacility(facility);
    setFormOpen(true);
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
    } catch (err: unknown) {
      await notify({
        variant: "danger",
        title: "Gagal",
        description:
          errorMessage(err, "Tidak dapat menghapus faskes."),
        confirmLabel: "Tutup",
      });
    }
  };

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

      <div className="relative max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Cari kode, nama, atau wilayah…"
          className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-xs text-tiby-ink outline-none focus:ring-2 focus:ring-tiby-teal-600"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <SkeletonRegion label="Memuat data faskes" className="col-span-full">
            <SkeletonCards
              count={6}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            />
          </SkeletonRegion>
        ) : facilities.length === 0 ? (
          <div className="col-span-full text-center py-16 bg-white rounded-2xl border border-gray-200">
            <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-tiby-muted">
              {search.trim()
                ? `Tidak ada faskes yang cocok dengan "${search.trim()}".`
                : "Belum ada data faskes yang ditambahkan."}
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
                      <Link
                        href={`/admin/facilities/${facility.id}`}
                        className="transition hover:text-tiby-teal-700"
                      >
                        {facility.name || "Tanpa Nama"}
                      </Link>
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
            <Pagination page={page} totalPages={totalPages} loading={loading} onChange={setPage} />
          </div>
        </div>
      )}

      {formOpen && (
        <FacilityFormModal
          facility={editingFacility}
          onClose={() => setFormOpen(false)}
          onSuccess={() => {
            setFormOpen(false);
            fetchFacilities();
          }}
        />
      )}
    </div>
  );
}
