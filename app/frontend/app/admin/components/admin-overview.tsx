"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { useSession, type TibyUser } from "@/lib/auth-client";
import { statsApi } from "@/lib/api/stats";
import { facilitiesApi } from "@/lib/api/facilities";
import type { AdminStats } from "@/lib/types/stats";
import type { FacilityItem } from "@/lib/types/facilities";
import PublicLoading from "@/components/ui/public-loading";
import MascotAnimation from "@/components/mascot-animation";
import {
  ArrowRight,
  BookOpen,
  Building2,
  ChevronRight,
  MapPin,
  ShieldCheck,
  Ticket,
  User,
  UserPlus,
  Users,
} from "lucide-react";

const QUICK_ACTIONS = [
  {
    href: "/admin/facilities",
    label: "Tambah Faskes",
    description: "Daftarkan puskesmas atau klinik baru.",
    icon: Building2,
  },
  {
    href: "/admin/users",
    label: "Buat Akun",
    description: "Tambahkan akun Nakes atau admin.",
    icon: UserPlus,
  },
  {
    href: "/admin/education",
    label: "Kelola Edukasi",
    description: "Atur materi global untuk semua faskes.",
    icon: BookOpen,
  },
];

export default function AdminOverview() {
  const { data: session } = useSession();
  const user = session?.user as TibyUser | undefined;

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [facilities, setFacilities] = useState<FacilityItem[]>([]);
  const [facilityTotal, setFacilityTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function fetchData() {
      try {
        const [statsRes, facilitiesRes] = await Promise.all([
          statsApi.getStats(),
          facilitiesApi.list({ limit: 5 }),
        ]);
        if (!active) return;
        if (statsRes.role === "ADMIN") {
          setStats(statsRes as AdminStats);
        }
        setFacilities(facilitiesRes.items || []);
        setFacilityTotal(facilitiesRes.total || 0);
      } catch (err) {
        console.error("Gagal memuat dashboard Admin:", err);
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchData();
    return () => {
      active = false;
    };
  }, []);

  if (loading)
    return <PublicLoading fullScreen message="Menyiapkan dashboard..." />;

  const totalFacilities = stats?.totalFacilities ?? 0;
  const totalNakes = stats?.totalNakes ?? 0;
  const totalPatients = stats?.totalPatients ?? 0;
  const patientsPerFacility =
    totalFacilities > 0 ? Math.round(totalPatients / totalFacilities) : 0;
  const nakesPerFacility =
    totalFacilities > 0 ? Math.round(totalNakes / totalFacilities) : 0;
  const patientsPerNakes =
    totalNakes > 0 ? Math.round(totalPatients / totalNakes) : 0;
  const ticketsPer100Patients =
    totalPatients > 0
      ? Math.round(((stats?.totalActiveTickets ?? 0) / totalPatients) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <p className="text-sm text-tiby-muted font-medium mb-1">
            Selamat Datang,
          </p>
          <h1 className="font-heading text-2xl font-bold text-tiby-ink">
            {user?.name || "Super Admin"} 👋
          </h1>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="bg-tiby-teal-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-tiby-teal-600/20 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />

            <div className="relative z-10 flex flex-col-reverse sm:flex-row items-center justify-between gap-6">
              <div className="space-y-4 text-center sm:text-left">
                <div>
                  <p className="text-tiby-teal-100 font-medium mb-1">
                    Kontrol Pusat Nasional
                  </p>
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <ShieldCheck className="w-6 h-6 text-emerald-300" />
                    <h2 className="text-3xl font-heading font-bold">
                      Tiby Platform
                    </h2>
                  </div>
                </div>

                <p className="text-sm text-tiby-teal-50/80 max-w-xs mx-auto sm:mx-0">
                  Kelola seluruh fasilitas kesehatan, tenaga kesehatan, dan
                  pantau statistik platform secara keseluruhan.
                </p>
              </div>

              <div className="shrink-0 flex items-center justify-center">
                <MascotAnimation size={140} className="drop-shadow-2xl" />
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs flex flex-col items-center justify-center text-center"
            >
              <div className="w-10 h-10 rounded-full bg-tiby-teal-50 flex items-center justify-center shrink-0 mb-3">
                <Building2 className="w-5 h-5 text-tiby-teal-600" />
              </div>
              <p className="text-xs font-semibold text-tiby-muted uppercase tracking-wider mb-1">
                Faskes
              </p>
              <p className="font-heading text-xl font-bold text-tiby-ink">
                {stats?.totalFacilities || 0}
              </p>
              <p className="mt-1 text-[10px] text-tiby-muted">
                {patientsPerFacility} pasien/faskes
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs flex flex-col items-center justify-center text-center"
            >
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0 mb-3">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-xs font-semibold text-tiby-muted uppercase tracking-wider mb-1">
                Nakes
              </p>
              <p className="font-heading text-xl font-bold text-tiby-ink">
                {stats?.totalNakes || 0}
              </p>
              <p className="mt-1 text-[10px] text-tiby-muted">
                {nakesPerFacility} nakes/faskes
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs flex flex-col items-center justify-center text-center"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 mb-3">
                <User className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-xs font-semibold text-tiby-muted uppercase tracking-wider mb-1">
                Pasien
              </p>
              <p className="font-heading text-xl font-bold text-tiby-ink">
                {stats?.totalPatients || 0}
              </p>
              <p className="mt-1 text-[10px] text-tiby-muted">
                {patientsPerNakes} pasien/nakes
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-white rounded-2xl border border-red-200 p-5 shadow-2xs flex flex-col items-center justify-center text-center relative overflow-hidden"
            >
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0 mb-3">
                <Ticket className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-1">
                Tiket Aktif
              </p>
              <p className="font-heading text-xl font-bold text-tiby-ink">
                {stats?.totalActiveTickets || 0}
              </p>
              <p className="mt-1 text-[10px] text-tiby-muted">
                {ticketsPer100Patients} per 100 pasien
              </p>
            </motion.div>
          </div>
        </div>

        <div className="h-full">
          <motion.section
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="h-full rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs"
          >
            <h3 className="font-heading text-base font-semibold text-tiby-ink">
              Aksi Cepat
            </h3>
            <p className="mt-0.5 text-xs text-tiby-muted">
              Tugas admin yang paling sering dipakai.
            </p>
            <div className="mt-3 space-y-2">
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="group flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-3 transition hover:border-tiby-teal-200 hover:bg-tiby-teal-50/50"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-tiby-teal-700 ring-1 ring-gray-200">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold text-tiby-ink">
                        {action.label}
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-tiby-muted">
                        {action.description}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-tiby-teal-600" />
                  </Link>
                );
              })}
            </div>
          </motion.section>
        </div>
      </div>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xs"
      >
        <header className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 sm:px-6">
          <div>
            <h3 className="font-heading text-base font-semibold text-tiby-ink">
              Faskes Terdaftar
            </h3>
            <p className="mt-0.5 text-xs text-tiby-muted">
              {facilityTotal} faskes di platform.
            </p>
          </div>
          <Link
            href="/admin/facilities"
            className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-tiby-teal-700 hover:text-tiby-teal-800"
          >
            Lihat semua <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </header>

        {facilities.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-tiby-muted">
            Belum ada faskes terdaftar.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {facilities.map((facility) => (
              <li key={facility.id}>
                <Link
                  href={`/admin/facilities/${facility.id}`}
                  className="flex items-center gap-3 px-5 py-3 transition hover:bg-gray-50 sm:px-6"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-tiby-teal-50 text-tiby-teal-700 ring-1 ring-tiby-teal-100">
                    <Building2 className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-tiby-ink">
                      {facility.name}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1 text-[11px] text-tiby-muted">
                      <MapPin className="h-3 w-3" />
                      {facility.district || "-"} · {facility.code}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </motion.section>
    </div>
  );
}
