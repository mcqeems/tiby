"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { useSession, type TibyUser } from "@/lib/auth-client";
import { statsApi } from "@/lib/api/stats";
import type { PmoStats } from "@/lib/types/stats";
import PublicLoading from "@/components/ui/public-loading";
import MascotAnimation from "@/components/mascot-animation";
import {
  Users,
  Clock,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  Bell,
} from "lucide-react";

export default function PmoOverview() {
  const { data: session } = useSession();
  const user = session?.user as TibyUser | undefined;

  const [stats, setStats] = useState<PmoStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function fetchStats() {
      try {
        const res = await statsApi.getStats();
        if (active && res.role === "PMO") {
          setStats(res as PmoStats);
        }
      } catch (err) {
        console.error("Gagal memuat stats PMO:", err);
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchStats();
    return () => {
      active = false;
    };
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 11) return "Selamat Pagi";
    if (hour < 15) return "Selamat Siang";
    if (hour < 19) return "Selamat Sore";
    return "Selamat Malam";
  };

  if (loading)
    return <PublicLoading fullScreen message="Menyiapkan dashboard..." />;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <p className="text-sm text-tiby-muted font-medium mb-1">
            {getGreeting()},
          </p>
          <h1 className="font-heading text-2xl font-bold text-tiby-ink">
            {user?.name || "Sobat Tiby"} 👋
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
                    Total Pasien Binaan
                  </p>
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <Users className="w-6 h-6 text-emerald-300" />
                    <h2 className="text-3xl font-heading font-bold">
                      {stats?.totalPatients || 0} Orang
                    </h2>
                  </div>
                </div>

                <p className="text-sm text-tiby-teal-50/80 max-w-xs mx-auto sm:mx-0">
                  Pantau kepatuhan dan berikan dukungan kepada pasien yang
                  membutuhkan pendampingan.
                </p>

                <Link
                  href="/pmo/pasien"
                  className="inline-flex items-center gap-2 bg-white text-tiby-teal-700 px-6 py-3 rounded-xl font-bold text-sm shadow-sm hover:scale-105 transition-transform"
                >
                  Lihat Pasien <ChevronRight className="w-5 h-5" />
                </Link>
              </div>

              <div className="shrink-0 flex items-center justify-center">
                <MascotAnimation size={140} className="drop-shadow-2xl" />
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-tiby-muted uppercase tracking-wider">
                  Sudah Check-in
                </p>
                <p className="font-heading text-xl font-bold text-tiby-ink">
                  {stats?.checkedInToday || 0} Pasien
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-tiby-muted uppercase tracking-wider">
                  Belum Check-in
                </p>
                <p className="font-heading text-xl font-bold text-tiby-ink">
                  {stats?.pendingCheckIn || 0} Pasien
                </p>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl border border-red-200 p-5 shadow-2xs relative overflow-hidden"
          >
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-red-50 rounded-full blur-xl" />
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-red-500 uppercase tracking-wider">
                  Risiko Tinggi
                </p>
                <p className="font-heading text-xl font-bold text-tiby-ink">
                  {stats?.highRiskPatients || 0} Pasien
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-white rounded-2xl border border-amber-200 p-5 shadow-2xs"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                <Bell className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
                  Alert Belum Dibaca
                </p>
                <p className="font-heading text-xl font-bold text-tiby-ink">
                  {stats?.unreadAlerts || 0} Pesan
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
