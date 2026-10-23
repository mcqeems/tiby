"use client";

import { useState, useEffect, useCallback } from "react";
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, facilitiesRes] = await Promise.all([
        usersApi.list({ page, limit: LIMIT, role: "NAKES,ADMIN" }),
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
  }, [notify, page]);

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
    <div className="max-w-5xl mx-auto space-y-5 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-heading font-bold text-tiby-ink">
            Manajemen Akun
          </h1>
          <p className="text-sm text-tiby-muted">
            Kelola akun Tenaga Kesehatan (Nakes) tiap Faskes.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-tiby-teal-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-tiby-teal-700 transition"
        >
          <UserPlus className="w-4 h-4" /> Buat Akun Nakes
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-600 uppercase font-semibold">
            <tr>
              <th className="px-5 py-4">Nama / Username</th>
              <th className="px-5 py-4">Peran</th>
              <th className="px-5 py-4">Faskes Penempatan</th>
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

      {isModalOpen && (
        <UserFormModal
          facilities={facilities}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
