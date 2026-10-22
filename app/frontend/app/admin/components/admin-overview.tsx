"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { facilitiesApi } from "@/lib/api/facilities";
import { usersApi } from "@/lib/api/users";
import PublicLoading from "@/components/ui/public-loading";
import {
  Building2,
  Users,
  Activity,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";

export default function AdminOverview() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalFacilities: 0,
    totalNakes: 0,
    totalUsers: 0,
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [facilities, users] = await Promise.all([
          facilitiesApi.getAll(),
          usersApi.getAll(),
        ]);

const nakesCount = users.filter(
  (u: { role: string }) => u.role === "NAKES",
).length;

        setStats({
          totalFacilities: facilities.length,
          totalNakes: nakesCount,
          totalUsers: users.length,
        });
      } catch (err) {
        console.error("Gagal load data admin", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return <PublicLoading message="Memuat data pusat..." />;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-gray-400 text-sm font-medium mb-1">
            Super Admin Control Center
          </p>
          <h1 className="text-3xl font-heading font-bold mb-4">
            Selamat Datang, Admin Pusat 👋
          </h1>
          <p className="text-gray-300 text-sm max-w-lg">
            Dari sini Anda dapat mengelola seluruh Fasilitas Kesehatan
            (Puskesmas/Klinik) dan akun Tenaga Kesehatan di seluruh Indonesia.
          </p>
        </div>
        <ShieldCheck className="absolute -right-8 -bottom-8 w-64 h-64 text-white/5" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-2xs flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-tiby-teal-50 flex items-center justify-center shrink-0">
            <Building2 className="w-7 h-7 text-tiby-teal-700" />
          </div>
          <div>
            <p className="text-xs font-semibold text-tiby-muted uppercase tracking-wider">
              Total Faskes
            </p>
            <p className="text-3xl font-heading font-bold text-tiby-ink">
              {stats.totalFacilities}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-2xs flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
            <Activity className="w-7 h-7 text-amber-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-tiby-muted uppercase tracking-wider">
              Total Tenaga Kesehatan
            </p>
            <p className="text-3xl font-heading font-bold text-tiby-ink">
              {stats.totalNakes}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-2xs flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center shrink-0">
            <Users className="w-7 h-7 text-purple-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-tiby-muted uppercase tracking-wider">
              Total Pengguna
            </p>
            <p className="text-3xl font-heading font-bold text-tiby-ink">
              {stats.totalUsers}
            </p>
          </div>
        </div>
      </div>

      <h2 className="text-lg font-heading font-bold text-tiby-ink mt-8 mb-4">
        Menu Cepat
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/admin/facilities"
          className="group bg-white rounded-2xl border border-gray-200 p-6 shadow-2xs hover:border-tiby-teal-300 hover:shadow-md transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-tiby-teal-50 transition-colors">
              <Building2 className="w-6 h-6 text-gray-600 group-hover:text-tiby-teal-700" />
            </div>
            <div>
              <h3 className="font-semibold text-tiby-ink">
                Kelola Data Faskes
              </h3>
              <p className="text-xs text-tiby-muted mt-0.5">
                Tambah, edit, dan hapus Puskesmas/Klinik.
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-tiby-teal-600 transition" />
        </Link>

        <Link
          href="/admin/users"
          className="group bg-white rounded-2xl border border-gray-200 p-6 shadow-2xs hover:border-tiby-teal-300 hover:shadow-md transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-tiby-teal-50 transition-colors">
              <Users className="w-6 h-6 text-gray-600 group-hover:text-tiby-teal-700" />
            </div>
            <div>
              <h3 className="font-semibold text-tiby-ink">Kelola Akun Nakes</h3>
              <p className="text-xs text-tiby-muted mt-0.5">
                Buat akun login untuk Tenaga Kesehatan.
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-tiby-teal-600 transition" />
        </Link>
      </div>
    </div>
  );
}
