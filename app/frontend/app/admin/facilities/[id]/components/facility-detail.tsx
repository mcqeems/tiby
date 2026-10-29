"use client";

import { useCallback, useEffect, useState } from "react";
import { roleLabel } from "@/lib/roles";
import { Skeleton, SkeletonRegion, SkeletonRows, SkeletonStats } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/errors";
import Link from "next/link";
import { useParams } from "next/navigation";
import { facilitiesApi } from "@/lib/api/facilities";
import { usersApi, type UserItem } from "@/lib/api/users";
import type { FacilityItem } from "@/lib/types/facilities";
import FacilityFormModal from "../../components/facility-form-modal";
import {
  ArrowLeft,
  Building2,
  ChevronLeft,
  ChevronRight,
  Edit2,
  MapPin,
  Phone,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const LIMIT = 8;
export default function FacilityDetail() {
  const params = useParams<{ id: string }>();
  const facilityId = params.id;

  const [facility, setFacility] = useState<FacilityItem | null>(null);
  const [staff, setStaff] = useState<UserItem[]>([]);
  const [staffTotal, setStaffTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const loadFacility = useCallback(async () => {
    const res = await facilitiesApi.get(facilityId);
    setFacility(res);
  }, [facilityId]);

  const loadStaff = useCallback(async () => {
    const res = await usersApi.list({
      facilityId,
      role: "NAKES,ADMIN",
      page,
      limit: LIMIT,
    });
    setStaff(res.items || []);
    setStaffTotal(res.total || 0);
  }, [facilityId, page]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadFacility(), loadStaff()]);
    } catch (err: unknown) {
      setError(
        errorMessage(err, "Gagal memuat data faskes."),
      );
    } finally {
      setLoading(false);
    }
  }, [loadFacility, loadStaff]);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (active) load();
    }, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [load]);

  if (loading)
    return (
      <SkeletonRegion label="Memuat detail faskes" className="space-y-5">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <SkeletonStats count={3} className="grid gap-4 sm:grid-cols-3" />
        <SkeletonRows rows={4} />
      </SkeletonRegion>
    );

  if (error || !facility) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/facilities"
          className="inline-flex items-center gap-2 text-xs font-semibold text-tiby-teal-700 hover:text-tiby-teal-800"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke daftar faskes
        </Link>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {error || "Faskes tidak ditemukan."}
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(staffTotal / LIMIT);

  return (
    <div className="space-y-5">
      <Link
        href="/admin/facilities"
        className="inline-flex items-center gap-2 text-xs font-semibold text-tiby-teal-700 hover:text-tiby-teal-800"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali ke daftar faskes
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-tiby-teal-50 text-tiby-teal-700 ring-1 ring-tiby-teal-100">
            <Building2 className="h-6 w-6" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-2xl font-bold text-tiby-ink">
                {facility.name}
              </h1>
              <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-600">
                {facility.code}
              </span>
            </div>
            <p className="mt-1 text-sm text-tiby-muted">
              Detail faskes dan akun yang ditempatkan di sini.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-tiby-ink transition hover:bg-gray-50"
        >
          <Edit2 className="h-4 w-4" /> Edit Faskes
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard icon={MapPin} label="Wilayah" value={facility.district || "-"} />
        <InfoCard
          icon={Phone}
          label="Telepon Darurat"
          value={facility.emergencyPhone || "-"}
        />
        <InfoCard
          icon={Users}
          label="Akun Staff"
          value={`${staffTotal} akun`}
        />
        <InfoCard
          icon={ShieldCheck}
          label="Status"
          value={facility.code ? "Terdaftar" : "-"}
        />
      </div>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
        <header className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 sm:px-6">
          <div>
            <h2 className="font-heading text-base font-semibold text-tiby-ink">
              Akun di Faskes Ini
            </h2>
            <p className="mt-0.5 text-xs text-tiby-muted">
              Tenaga kesehatan dan admin yang ditempatkan di faskes ini.
            </p>
          </div>
          <Link
            href={`/admin/users?facilityId=${facilityId}`}
            className="shrink-0 rounded-xl bg-tiby-teal-50 px-3 py-2 text-[11px] font-semibold text-tiby-teal-700 ring-1 ring-tiby-teal-100 transition hover:bg-tiby-teal-100"
          >
            Kelola Akun
          </Link>
        </header>

        {staff.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Users className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            <p className="text-sm text-tiby-muted">
              Belum ada akun yang ditempatkan di faskes ini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase text-gray-600">
                <tr>
                  <th className="px-5 py-3 sm:px-6">Nama / Username</th>
                  <th className="px-5 py-3">Peran</th>
                  <th className="px-5 py-3">Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {staff.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3.5 sm:px-6">
                      <p className="font-semibold text-tiby-ink">{user.name}</p>
                      <p className="font-mono text-xs text-tiby-muted">
                        @{user.username}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="rounded-full bg-tiby-teal-50 px-2.5 py-0.5 text-[11px] font-semibold text-tiby-teal-700 ring-1 ring-tiby-teal-100">
                        {roleLabel(user.role)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-tiby-muted">
                      {user.email || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {staffTotal > LIMIT && (
          <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-5 py-3">
            <span className="text-xs text-tiby-muted">
              Menampilkan {(page - 1) * LIMIT + 1}–
              {Math.min(page * LIMIT, staffTotal)} dari {staffTotal} akun
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-gray-200 bg-white p-1.5 text-tiby-ink disabled:opacity-50 hover:bg-gray-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 text-xs font-medium text-tiby-ink">
                Hal {page} / {totalPages || 1}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-lg border border-gray-200 bg-white p-1.5 text-tiby-ink disabled:opacity-50 hover:bg-gray-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </section>

      {editOpen && (
        <FacilityFormModal
          facility={facility}
          onClose={() => setEditOpen(false)}
          onSuccess={() => {
            setEditOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-tiby-teal-700 ring-1 ring-gray-200">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-tiby-muted">
          {label}
        </p>
        <p className="truncate text-sm font-semibold text-tiby-ink">{value}</p>
      </div>
    </div>
  );
}
