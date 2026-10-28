"use client";

import { useState, useEffect, useCallback } from "react";
import {
  educationApi,
  type EducationItem,
  type CreateEducationDto,
  type EducationCategory, // ✅ Import tipe
  type EducationPhase, // ✅ Import tipe
} from "@/lib/api/education";
import { usePopup } from "@/components/ui/popup-provider";
import PublicLoading from "@/components/ui/public-loading";
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  X,
  Loader2,
  Save,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const LIMIT = 10;

const CATEGORIES: { value: EducationCategory; label: string }[] = [
  { value: "ADHERENCE", label: "Kepatuhan Obat" },
  { value: "SIDE_EFFECTS", label: "Efek Samping" },
  { value: "NUTRITION", label: "Nutrisi" },
  { value: "STIGMA", label: "Stigma Sosial" },
  { value: "GENERAL", label: "Umum" },
];

const PHASES: { value: EducationPhase; label: string }[] = [
  { value: "INTENSIF", label: "Fase Intensif" },
  { value: "LANJUTAN", label: "Fase Lanjutan" },
];

export default function EducationManager() {
  const { notify, confirm } = usePopup();
  const [cards, setCards] = useState<EducationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateEducationDto>({
    title: "",
    summary: "",
    contentMarkdown: "",
    category: "ADHERENCE",
    phase: "INTENSIF",
    sortOrder: 0,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchCards = useCallback(async () => {
    setLoading(true);
    try {
      const res = await educationApi.getAll({ page, limit: LIMIT });
      setCards(res.items || []);
      setTotal(res.total || 0);
    } catch {
      await notify({
        variant: "danger",
        title: "Gagal",
        description: "Tidak dapat memuat data edukasi.",
        confirmLabel: "Tutup",
      });
    } finally {
      setLoading(false);
    }
  }, [notify, page]);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (active) fetchCards();
    }, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [fetchCards]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      title: "",
      summary: "",
      contentMarkdown: "",
      category: "ADHERENCE",
      phase: "INTENSIF",
      sortOrder: 0,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (card: EducationItem) => {
    setEditingId(card.id);
    setFormData({
      title: card.title,
      summary: card.summary,
      contentMarkdown: card.contentMarkdown,
      category: card.category,
      phase: card.phase,
      sortOrder: card.sortOrder,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      variant: "danger",
      title: "Hapus Materi Edukasi?",
      description: "Materi ini akan dihapus permanen dari aplikasi pasien.",
      confirmLabel: "Ya, Hapus",
      cancelLabel: "Batal",
    });

    if (!isConfirmed) return;

    try {
      await educationApi.remove(id);
      await notify({
        variant: "success",
        title: "Terhapus",
        description: "Materi berhasil dihapus.",
        confirmLabel: "Tutup",
      });
      // Deleting the last card on a page would leave an empty page behind.
      if (cards.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        fetchCards();
      }
    } catch {
      await notify({
        variant: "danger",
        title: "Gagal",
        description: "Tidak dapat menghapus materi.",
        confirmLabel: "Tutup",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.title.length < 5 || formData.contentMarkdown.length < 10) {
      return notify({
        variant: "warning",
        title: "Validasi Gagal",
        description: "Judul minimal 5 karakter dan isi minimal 10 karakter.",
        confirmLabel: "Mengerti",
      });
    }

    try {
      setSubmitting(true);
      if (editingId) {
        await educationApi.update(editingId, formData);
        await notify({
          variant: "success",
          title: "Berhasil",
          description: "Materi edukasi diperbarui.",
          confirmLabel: "Tutup",
        });
      } else {
        await educationApi.create(formData);
        await notify({
          variant: "success",
          title: "Berhasil",
          description: "Materi edukasi baru ditambahkan.",
          confirmLabel: "Tutup",
        });
      }
      setIsModalOpen(false);
      fetchCards();
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

  if (loading) return <PublicLoading message="Memuat materi edukasi..." />;

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-heading font-bold text-tiby-ink">
            Kelola Edukasi
          </h1>
          <p className="text-sm text-tiby-muted">
            Materi bacaan untuk pasien TBC.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-tiby-teal-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-tiby-teal-700 transition"
        >
          <Plus className="w-4 h-4" />
          Tambah Materi
        </button>
      </div>

      <div className="grid gap-4">
        {cards.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-tiby-muted">
              Belum ada materi edukasi yang dibuat.
            </p>
          </div>
        ) : (
          cards.map((card) => (
            <div
              key={card.id}
              className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs flex flex-col md:flex-row justify-between md:items-center gap-4"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-tiby-teal-700 bg-tiby-teal-50 px-2 py-0.5 rounded-md border border-tiby-teal-100">
                    {card.category}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                    {card.phase}
                  </span>
                </div>
                <h3 className="font-heading font-semibold text-base text-tiby-ink truncate">
                  {card.title}
                </h3>
                <p className="text-xs text-tiby-muted truncate">
                  {card.summary}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleOpenEdit(card)}
                  className="p-2 text-tiby-muted hover:text-tiby-teal-700 hover:bg-tiby-teal-50 rounded-lg transition"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(card.id)}
                  className="p-2 text-tiby-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  title="Hapus"
                >
                  <Trash2 className="w-4 h-4" />
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
            <strong>{total}</strong> materi
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
          <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-xl overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50/50 shrink-0">
              <h3 className="font-heading font-bold text-tiby-ink">
                {editingId ? "Edit Materi Edukasi" : "Tambah Materi Edukasi"}
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
                    Judul
                  </label>
                  <input
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:ring-2 focus:ring-tiby-teal-600 outline-none"
                    placeholder="Judul materi..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-tiby-ink mb-1.5">
                    Kategori
                  </label>
                  <select
                    value={formData.category}
                    // ✅ FIX: Ganti any dengan EducationCategory
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        category: e.target.value as EducationCategory,
                      })
                    }
                    className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:ring-2 focus:ring-tiby-teal-600 outline-none cursor-pointer"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-tiby-ink mb-1.5">
                    Fase Pengobatan
                  </label>
                  <select
                    value={formData.phase}
                    // ✅ FIX: Ganti any dengan EducationPhase
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        phase: e.target.value as EducationPhase,
                      })
                    }
                    className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:ring-2 focus:ring-tiby-teal-600 outline-none cursor-pointer"
                  >
                    {PHASES.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-tiby-ink mb-1.5">
                    Urutan (Sort Order)
                  </label>
                  <input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sortOrder: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:ring-2 focus:ring-tiby-teal-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-tiby-ink mb-1.5">
                  Ringkasan Singkat
                </label>
                <input
                  value={formData.summary}
                  onChange={(e) =>
                    setFormData({ ...formData, summary: e.target.value })
                  }
                  className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:ring-2 focus:ring-tiby-teal-600 outline-none"
                  placeholder="Tampil di halaman depan kartu..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-tiby-ink mb-1.5">
                  Isi Materi (Markdown)
                </label>
                <textarea
                  value={formData.contentMarkdown}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      contentMarkdown: e.target.value,
                    })
                  }
                  className="w-full h-40 rounded-xl border border-gray-200 p-3 text-sm font-mono focus:ring-2 focus:ring-tiby-teal-600 outline-none resize-none"
                  placeholder="### Judul Materi&#10;Isi materi di sini...&#10;- Poin 1&#10;- Poin 2"
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
                  {submitting ? "Menyimpan..." : "Simpan Materi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
