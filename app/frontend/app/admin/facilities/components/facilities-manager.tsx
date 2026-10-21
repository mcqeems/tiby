"use client";

import { useState, useEffect } from "react";
import { api, type FacilityItem } from "@/lib/api";
import FacilityFormModal from "./facility-form-modal";
import {
  Building2,
  Plus,
  RefreshCw,
  Search,
  MapPin,
  Phone,
  Pencil,
  Trash2,
  Copy,
  Check,
  X,
} from "lucide-react";

export default function FacilitiesManager() {
  const [facilities, setFacilities] = useState<FacilityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter & Search
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFacility, setEditingFacility] = useState<FacilityItem | null>(
    null,
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    api.facilities
      .getAll()
      .then((res) => {
        if (!ignore) {
          setFacilities(Array.isArray(res) ? res : []);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          setErrorMsg(
            err instanceof Error
              ? err.message
              : "Gagal memuat daftar fasilitas kesehatan",
          );
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    setErrorMsg(null);
    api.facilities
      .getAll()
      .then((res) => {
        setFacilities(Array.isArray(res) ? res : []);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setErrorMsg(
          err instanceof Error
            ? err.message
            : "Gagal memuat daftar fasilitas kesehatan",
        );
        setLoading(false);
      });
  };

  const handleDelete = async (item: FacilityItem) => {
    if (!window.confirm(`Hapus fasilitas "${item.name}"?`)) return;
    try {
      await api.facilities.remove(item.id);
      setFacilities((prev) => prev.filter((f) => f.id !== item.id));
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Gagal menghapus fasilitas.",
      );
    }
  };

  const copyFacilityId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredFacilities = facilities.filter((f) => {
    const matchSearch =
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.code.toLowerCase().includes(search.toLowerCase()) ||
      f.city.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "ALL" || f.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold text-tiby-teal-600 uppercase tracking-wider block mb-0.5">
            Manajemen Instansi
          </span>
          <h1 className="font-heading text-2xl font-600 text-tiby-ink">
            Master Fasilitas Kesehatan
          </h1>
          <p className="mt-1 text-xs text-tiby-muted">
            Kelola daftar Puskesmas, Rumah Sakit, dan Klinik tempat Nakes serta
            pasien bernaung.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 rounded-full border border-tiby-teal-100 bg-white px-4 py-2 text-xs font-semibold text-tiby-teal-700 hover:bg-tiby-teal-50 transition shadow-xs cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingFacility(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-full bg-tiby-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-tiby-teal-700 transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Fasilitas</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-2xl border border-red-100 bg-tiby-danger p-3 text-xs text-tiby-danger-text flex justify-between items-center">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="font-bold cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="w-4 h-4 text-tiby-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari nama faskes, kode, atau kota..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-tiby-teal-100 bg-white pl-9 pr-4 py-2 text-xs text-tiby-ink placeholder:text-tiby-muted transition focus:border-tiby-teal-600 focus:outline-none focus:ring-2 focus:ring-tiby-teal-600/20 shadow-xs"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-xl border border-tiby-teal-100 bg-white px-3 py-2 text-xs text-tiby-ink focus:outline-none focus:ring-2 focus:ring-tiby-teal-600 shadow-xs cursor-pointer"
        >
          <option value="ALL">Semua Tipe Faskes</option>
          <option value="PUSKESMAS">Puskesmas</option>
          <option value="RUMAH_SAKIT">Rumah Sakit</option>
          <option value="KLINIK">Klinik</option>
        </select>

        <span className="text-xs text-tiby-muted ml-auto">
          Total: <strong>{filteredFacilities.length}</strong> Fasilitas
        </span>
      </div>

      {/* Facilities Table */}
      <div className="overflow-hidden rounded-2xl border border-tiby-teal-100 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-tiby-teal-100 bg-tiby-teal-50/50 text-tiby-muted uppercase tracking-wider font-semibold text-[11px]">
              <tr>
                <th className="px-4 py-3">Nama &amp; Kode Faskes</th>
                <th className="px-4 py-3">Tipe</th>
                <th className="px-4 py-3">Wilayah</th>
                <th className="px-4 py-3">ID Fasilitas (UUID)</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tiby-teal-50">
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-tiby-muted"
                  >
                    Memuat data fasilitas...
                  </td>
                </tr>
              ) : filteredFacilities.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-tiby-muted"
                  >
                    Belum ada fasilitas kesehatan yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filteredFacilities.map((f) => (
                  <tr
                    key={f.id}
                    className="transition hover:bg-tiby-teal-50/30"
                  >
                    {/* Name & Code */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-tiby-teal-50 text-tiby-teal-700">
                          <Building2 className="w-4 h-4" />
                        </span>
                        <div>
                          <p className="font-semibold text-tiby-ink">
                            {f.name}
                          </p>
                          <p className="text-[11px] text-tiby-muted font-mono">
                            {f.code}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="px-4 py-3.5">
                      <span className="inline-block rounded-full bg-tiby-teal-50 px-2.5 py-0.5 text-[10px] font-bold text-tiby-teal-700">
                        {f.type.replace("_", " ")}
                      </span>
                    </td>

                    {/* Location & Phone */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 text-tiby-ink font-medium">
                        <MapPin className="w-3.5 h-3.5 text-tiby-teal-600 shrink-0" />
                        <span>
                          {f.city}, {f.province}
                        </span>
                      </div>
                      {f.phone && (
                        <div className="flex items-center gap-1 text-[11px] text-tiby-muted mt-0.5">
                          <Phone className="w-3 h-3 shrink-0" />
                          <span>{f.phone}</span>
                        </div>
                      )}
                    </td>

                    {/* Facility ID (UUID) with Copy */}
                    <td className="px-4 py-3.5">
                      <div className="inline-flex items-center gap-1.5 rounded-lg border border-tiby-teal-100/80 bg-gray-50/60 px-2.5 py-1 font-mono text-[11px] text-tiby-muted">
                        <span className="truncate max-w-[120px]">{f.id}</span>
                        <button
                          type="button"
                          onClick={() => copyFacilityId(f.id)}
                          title="Salin ID Fasilitas"
                          className="text-tiby-teal-700 hover:text-tiby-teal-900 cursor-pointer"
                        >
                          {copiedId === f.id ? (
                            <Check className="w-3.5 h-3.5 text-green-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingFacility(f);
                            setModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 rounded-full border border-tiby-teal-100 bg-white px-3 py-1 text-xs font-semibold text-tiby-teal-700 hover:bg-tiby-teal-50 transition cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(f)}
                          className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-white p-1.5 text-red-600 hover:bg-red-50 transition cursor-pointer"
                          title="Hapus Fasilitas"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah / Edit */}
      {modalOpen && (
        <FacilityFormModal
          initialData={editingFacility}
          onClose={() => {
            setModalOpen(false);
            setEditingFacility(null);
          }}
          onSuccess={(saved) => {
            if (editingFacility) {
              setFacilities((prev) =>
                prev.map((item) => (item.id === saved.id ? saved : item)),
              );
            } else {
              setFacilities((prev) => [saved, ...prev]);
            }
            setModalOpen(false);
            setEditingFacility(null);
          }}
        />
      )}
    </div>
  );
}
