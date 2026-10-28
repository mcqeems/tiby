"use client";

import { useState } from "react";
import { usersApi, type UserItem } from "@/lib/api/users";
import type { FacilityItem } from "@/lib/types/facilities";
import { usePopup } from "@/components/ui/popup-provider";
import { X, Loader2, Save } from "lucide-react";

interface UserFormModalProps {
  facilities: FacilityItem[];
  editingUser?: UserItem;
  defaultFacilityId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UserFormModal({
  facilities,
  editingUser,
  defaultFacilityId,
  onClose,
  onSuccess,
}: UserFormModalProps) {
  const { notify } = usePopup();
  const isEdit = Boolean(editingUser);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    fullName: editingUser?.name ?? "",
    username: editingUser?.username ?? "",
    email: editingUser?.email ?? "",
    password: "",
    role: editingUser?.role ?? "NAKES",
    facilityId: editingUser?.facilityId ?? defaultFacilityId ?? "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isEdit && !formData.facilityId) {
      return notify({
        variant: "warning",
        title: "Validasi Gagal",
        description: "Pilih Faskes penempatan.",
        confirmLabel: "Mengerti",
      });
    }
    if (formData.role === "NAKES" && !formData.facilityId) {
      return notify({
        variant: "warning",
        title: "Validasi Gagal",
        description: "Akun NAKES harus memiliki Faskes penempatan.",
        confirmLabel: "Mengerti",
      });
    }
    if (formData.fullName.length < 3) {
      return notify({
        variant: "warning",
        title: "Validasi Gagal",
        description: "Nama lengkap minimal 3 karakter.",
        confirmLabel: "Mengerti",
      });
    }
    if (!isEdit && formData.username.length < 3) {
      return notify({
        variant: "warning",
        title: "Validasi Gagal",
        description: "Username minimal 3 karakter.",
        confirmLabel: "Mengerti",
      });
    }
    if (!isEdit && formData.password.length < 8) {
      return notify({
        variant: "warning",
        title: "Validasi Gagal",
        description: "Password minimal 8 karakter.",
        confirmLabel: "Mengerti",
      });
    }

    try {
      setSubmitting(true);
      if (editingUser) {
        await usersApi.update(editingUser.id, {
          fullName: formData.fullName,
          email: formData.email,
          role: formData.role,
          facilityId: formData.facilityId || null,
        });
        await notify({
          variant: "success",
          title: "Berhasil",
          description: "Data akun berhasil diperbarui.",
          confirmLabel: "Tutup",
        });
      } else {
        await usersApi.createUser({
          fullName: formData.fullName,
          username: formData.username,
          email: formData.email,
          password: formData.password,
          role: "NAKES",
          facilityId: formData.facilityId,
        });
        await notify({
          variant: "success",
          title: "Berhasil",
          description: "Akun Nakes berhasil dibuat.",
          confirmLabel: "Tutup",
        });
      }
      onSuccess();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Pastikan format email benar dan username belum dipakai.";
      await notify({
        variant: "danger",
        title: isEdit ? "Gagal Memperbarui Akun" : "Gagal Membuat Akun",
        description: message,
        confirmLabel: "Tutup",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl overflow-hidden animate-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50/50">
          <h3 className="font-heading font-bold text-tiby-ink">
            {isEdit ? "Edit Akun" : "Buat Akun Nakes Baru"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:bg-gray-200 p-1.5 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-tiby-ink mb-1.5">
              Pilih Faskes Penempatan *
            </label>
            <select
              value={formData.facilityId}
              onChange={(e) =>
                setFormData({ ...formData, facilityId: e.target.value })
              }
              className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:ring-2 focus:ring-tiby-teal-600 outline-none"
            >
              <option value="">-- Pilih Faskes --</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.code})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-tiby-ink mb-1.5">
                Nama Lengkap *
              </label>
              <input
                required
                minLength={3}
                value={formData.fullName}
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
                className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:ring-2 focus:ring-tiby-teal-600"
                placeholder="dr. Budi"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-tiby-ink mb-1.5">
                Username {isEdit ? "" : "*"}
              </label>
              <input
                required={!isEdit}
                disabled={isEdit}
                minLength={3}
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:ring-2 focus:ring-tiby-teal-600 disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="dokter_budi"
              />
              <span className="text-[10px] text-gray-500 mt-1 block">
                {isEdit ? "Username tidak dapat diubah." : "Minimal 3 karakter, tanpa spasi."}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-tiby-ink mb-1.5">
              Email *
            </label>
            <input
              required
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:ring-2 focus:ring-tiby-teal-600"
              placeholder="budi@faskes.com"
            />
          </div>

          {isEdit ? (
            <div>
              <label className="block text-xs font-semibold text-tiby-ink mb-1.5">
                Peran
              </label>
              <select
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value as "NAKES" | "ADMIN" })
                }
                className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:ring-2 focus:ring-tiby-teal-600 outline-none"
              >
                <option value="NAKES">NAKES</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-tiby-ink mb-1.5">
                Password Awal *
              </label>
              <input
                required
                type="text"
                minLength={8}
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:ring-2 focus:ring-tiby-teal-600"
                placeholder="Minimal 8 karakter"
              />
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
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
              )}{" "}
              {isEdit ? "Simpan Perubahan" : "Buat Akun"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
