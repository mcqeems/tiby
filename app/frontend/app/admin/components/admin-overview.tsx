"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { useSession, type TibyUser } from "@/lib/auth-client";
import { statsApi } from "@/lib/api/stats";
import type { AdminStats } from "@/lib/types/stats";
import PublicLoading from "@/components/ui/public-loading";
import MascotAnimation from "@/components/mascot-animation";
import { Building2, Users, ShieldCheck, Ticket, User } from "lucide-react";

export default function AdminOverview() {
  const { data: session } = useSession();
  const user = session?.user as TibyUser | undefined;

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function fetchStats() {
      try {
        const res = await statsApi.getStats();
        if (active && res.role === "ADMIN") {
          setStats(res as AdminStats);
        }
      } catch (err) {
        console.error("Gagal memuat stats Admin:", err);
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchStats();
    return () => {
      active = false;
    };
  }, []);

  if (loading)
    return <PublicLoading fullScreen message="Menyiapkan dashboard..." />;

  return (
    <div className="max-w-6xl mx-auto space-y-6 md:pb-10">
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
            className="bg-linear-to-br from-gray-900 to-black rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />

            <div className="relative z-10 flex flex-col-reverse sm:flex-row items-center justify-between gap-6">
              <div className="space-y-4 text-center sm:text-left">
                <div>
                  <p className="text-gray-400 font-medium mb-1">
                    Kontrol Pusat Nasional
                  </p>
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <ShieldCheck className="w-6 h-6 text-tiby-teal-400" />
                    <h2 className="text-3xl font-heading font-bold">
                      Tiby Platform
                    </h2>
                  </div>
                </div>

                <p className="text-sm text-gray-400 max-w-xs mx-auto sm:mx-0">
                  Kelola seluruh fasilitas kesehatan, tenaga kesehatan, dan
                  pantau statistik platform secara keseluruhan.
                </p>
              </div>

              <div className="shrink-0 flex items-center justify-center grayscale opacity-80">
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
            </motion.div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-tiby-teal-50 rounded-2xl border border-tiby-teal-100 p-6 shadow-2xs h-full flex flex-col justify-center"
          >
            <h3 className="font-heading font-bold text-lg text-tiby-teal-900 mb-2">
              Pusat Kendali
            </h3>
            <p className="text-sm text-tiby-teal-700 leading-relaxed mb-6">
              Gunakan menu di samping untuk mengelola data Master Faskes dan
              Akun Tenaga Kesehatan.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
