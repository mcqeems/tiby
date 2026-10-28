"use client";

import { useState, useEffect, useCallback } from "react";
import { ModalCard, ModalOverlay } from "@/components/ui/modal-frame";
import { AnimatePresence } from "motion/react";
import { usersApi, type UserItem } from "@/lib/api/users";
import { facilitiesApi } from "@/lib/api/facilities";
import type { FacilityItem } from "@/lib/types/facilities";
import { usePopup } from "@/components/ui/popup-provider";
import PublicLoading from "@/components/ui/public-loading";
import UserFormModal from "./user-form-modal";
import {
  UserPlus,
  Building2,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Pencil,
  KeyRound,
  Search,
  Loader2,
  X,
} from "lucide-react";

const LIMIT = 20;

export default function UserManager() {
  const { notify } = usePopup();

  const [users, setUsers] = useState<UserItem[]>([]);
  const [facilities, setFacilities] = useState<FacilityItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [facilityFilter, setFacilityFilter] = useState("");
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [resetUser, setResetUser] = useState<UserItem | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetSubmitting, setResetSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, facilitiesRes] = await Promise.all([
        usersApi.list({
          page,
          limit: LIMIT,
          role: roleFilter === "ALL" ? undefined : roleFilter,
          search: search.trim() || undefined,
          facilityId: facilityFilter || undefined,
        }),
        facilitiesApi.list({ limit: 100 }),
      ]);
      setUsers(usersRes.items || []);
      setTotal(usersRes.total || 0);
      setFacilities(facilitiesRes.items || []);
    } catch {
      await notify({
        variant: "danger",
        title: "Gagal",
        description: "Tidak dapat memuat data.",
        confirmLabel: "Tutup",
      });
    } finally {
      setLoading(false);
    }
  }, [notify, page, search, roleFilter, facilityFilter]);

  useEffect(() => {
    // Deep link from the facility detail page; avoids useSearchParams during
    // prerender. Deferred so the effect body itself stays pure.
    const timer = setTimeout(() => {
      const id = new URLSearchParams(window.location.search).get("facilityId");
      if (id) setFacilityFilter(id);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (active) fetchData();
    }, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [fetchData]);

  if (loading && users.length === 0)
    return <PublicLoading message="Memuat data pengguna..." />;

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-heading font-bold text-tiby-ink">
            Manajemen Akun
          </h1>
          <p className="text-sm text-tiby-muted">
            Kelola akun Nakes, admin, pasien, dan PMO.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-tiby-teal-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-tiby-teal-700 transition"
        >
          <UserPlus className="w-4 h-4" /> Buat Akun Nakes
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Cari nama, username, atau email…"
            className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-xs text-tiby-ink outline-none focus:ring-2 focus:ring-tiby-teal-600"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
          aria-label="Filter peran"
          className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-tiby-ink outline-none focus:ring-2 focus:ring-tiby-teal-600"
        >
          <option value="ALL">Semua Peran</option>
          <option value="NAKES">Nakes</option>
          <option value="ADMIN">Admin</option>
          <option value="PASIEN">Pasien</option>
          <option value="PMO">PMO</option>
        </select>

        <select
          value={facilityFilter}
          onChange={(e) => {
            setFacilityFilter(e.target.value);
            setPage(1);
          }}
          aria-label="Filter faskes"
          className="h-10 max-w-full rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-tiby-ink outline-none focus:ring-2 focus:ring-tiby-teal-600"
        >
          <option value="">Semua Faskes</option>
          {facilities.map((facility) => (
            <option key={facility.id} value={facility.id}>
              {facility.name} ({facility.code})
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-600 uppercase font-semibold">
            <tr>
              <th className="px-5 py-4">Nama / Username</th>
              <th className="px-5 py-4">Peran</th>
              <th className="px-5 py-4">Faskes Penempatan</th>
              <th className="px-5 py-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50/50">
                <td className="px-5 py-4">
                  <p className="font-semibold text-tiby-ink">{u.name}</p>
                  <p className="text-xs font-mono text-tiby-muted">
                    @{u.username}
                  </p>
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      u.role === "ADMIN"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-tiby-teal-100 text-tiby-teal-700"
                    }`}
                  >
                    {u.role === "ADMIN" && <ShieldCheck className="w-3 h-3" />}
                    {u.role}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-tiby-ink">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    {u.facility || "-"}
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      title="Edit akun"
                      onClick={() => setEditingUser(u)}
                      className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-tiby-teal-700"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="Reset password"
                      onClick={() => {
                        setResetUser(u);
                        setResetPassword("");
                      }}
                      className="rounded-lg p-2 text-gray-400 transition hover:bg-amber-50 hover:text-amber-600"
                    >
                      <KeyRound className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {total > 0 && (
          <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-5 py-3">
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
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <UserFormModal
            facilities={facilities}
            defaultFacilityId={facilityFilter || undefined}
            onClose={() => setIsModalOpen(false)}
            onSuccess={() => {
              setIsModalOpen(false);
              fetchData();
            }}
          />
        )}

        {editingUser && (
          <UserFormModal
            facilities={facilities}
            editingUser={editingUser}
            onClose={() => setEditingUser(null)}
            onSuccess={() => {
              setEditingUser(null);
              fetchData();
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {resetUser && (
          <ModalOverlay label="Reset Password">
            <ModalCard className="w-full max-w-md rounded-2xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-5 py-4">
                <h3 className="font-heading font-bold text-tiby-ink">
                  Reset Password
                </h3>
                <button
                  onClick={() => setResetUser(null)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (resetPassword.length < 8) {
                    return notify({
                      variant: "warning",
                      title: "Validasi Gagal",
                      description: "Password minimal 8 karakter.",
                      confirmLabel: "Mengerti",
                    });
                  }
                  setResetSubmitting(true);
                  try {
                    await usersApi.resetPassword(resetUser.id, resetPassword);
                    await notify({
                      variant: "success",
                      title: "Berhasil",
                      description: `Password ${resetUser.username} telah direset.`,
                      confirmLabel: "Tutup",
                    });
                    setResetUser(null);
                    setResetPassword("");
                  } catch (err: unknown) {
                    await notify({
                      variant: "danger",
                      title: "Gagal",
                      description:
                        err instanceof Error
                          ? err.message
                          : "Tidak dapat mereset password.",
                      confirmLabel: "Tutup",
                    });
                  } finally {
                    setResetSubmitting(false);
                  }
                }}
                className="space-y-4 p-5"
              >
                <p className="text-xs text-tiby-muted">
                  Password baru untuk{" "}
                  <span className="font-semibold text-tiby-ink">
                    @{resetUser.username}
                  </span>
                  . Sampaikan ke pengguna setelah disimpan.
                </p>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-tiby-ink">
                    Password Baru
                  </label>
                  <input
                    type="text"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    minLength={8}
                    required
                    placeholder="Minimal 8 karakter"
                    className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:ring-2 focus:ring-tiby-teal-600"
                  />
                </div>
                <div className="flex gap-3 border-t border-gray-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setResetUser(null)}
                    className="h-11 flex-1 rounded-xl border border-gray-200 text-xs font-semibold hover:bg-gray-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={resetSubmitting}
                    className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-tiby-teal-600 text-xs font-semibold text-white hover:bg-tiby-teal-700 disabled:opacity-50"
                  >
                    {resetSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <KeyRound className="h-4 w-4" />
                    )}
                    Simpan Password
                  </button>
                </div>
              </form>
            </ModalCard>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </div>
  );
}
