"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useSession, type TibyUser } from "@/lib/auth-client";
import { checkInsApi } from "@/lib/api/check-in";
import { educationApi, type EducationItem } from "@/lib/api/education";
import { facilitiesApi } from "@/lib/api/facilities";
import type { CheckInHistoryItem } from "@/lib/types/check-in";
import type { FacilityItem } from "@/lib/types/facilities";
import PublicLoading from "@/components/ui/public-loading";
// ✅ Ganti import ke MascotAnimation agar selalu beranimasi
import MascotAnimation from "@/components/mascot-animation";
import {
  Pill,
  Flame,
  BookOpen,
  ChevronRight,
  CheckCircle2,
  Clock,
  ShieldCheck,
  CalendarDays,
  User,
  HeartPulse,
} from "lucide-react";

const getLocalDateStr = (dateString: string) => {
  const d = new Date(dateString);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const calculateStreak = (history: CheckInHistoryItem[]) => {
  if (history.length === 0) return 0;
  const sorted = [...history].sort(
    (a, b) =>
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
  );
  if (!sorted[0].isDoseFulfilled) return 0;

  let streak = 0;
  const expectedDate = new Date(sorted[0].submittedAt);
  expectedDate.setHours(0, 0, 0, 0);

  for (let i = 0; i < sorted.length; i++) {
    const itemDate = new Date(sorted[i].submittedAt);
    itemDate.setHours(0, 0, 0, 0);
    if (
      itemDate.getTime() === expectedDate.getTime() &&
      sorted[i].isDoseFulfilled
    ) {
      streak++;
      expectedDate.setDate(expectedDate.getDate() - 1);
    } else {
      break;
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const latestCheckIn = new Date(sorted[0].submittedAt);
  latestCheckIn.setHours(0, 0, 0, 0);
  const diffInDays = Math.floor(
    (today.getTime() - latestCheckIn.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffInDays > 1) return 0;
  return streak;
};

const ComplianceCalendar = ({ history }: { history: CheckInHistoryItem[] }) => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let firstDay = new Date(year, month, 1).getDay();
  firstDay = firstDay === 0 ? 6 : firstDay - 1;

  const dayNames = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

  const checkInMap = new Map<string, CheckInHistoryItem>();
  history.forEach((item) => {
    checkInMap.set(getLocalDateStr(item.submittedAt), item);
  });

  const startDate =
    history.length > 0
      ? getLocalDateStr(
          [...history].sort(
            (a, b) =>
              new Date(a.submittedAt).getTime() -
              new Date(b.submittedAt).getTime(),
          )[0].submittedAt,
        )
      : getLocalDateStr(new Date().toISOString());

  const todayStr = getLocalDateStr(today.toISOString());

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-bold text-sm text-tiby-ink flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-tiby-teal-600" /> Jejak
          Kepatuhan
        </h3>
        <span className="text-[10px] font-bold text-tiby-muted uppercase tracking-wider">
          {today.toLocaleDateString("id-ID", {
            month: "long",
            year: "numeric",
          })}
        </span>
      </div>

      <div className="max-w-sm mx-auto">
        <div className="grid grid-cols-7 gap-1.5 mb-2">
          {dayNames.map((day) => (
            <div
              key={day}
              className="text-center text-[10px] font-bold text-tiby-muted uppercase"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="aspect-square rounded-md bg-gray-50/50"
            />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const checkIn = checkInMap.get(dateStr);
            const isPast = dateStr < todayStr;
            const isToday = dateStr === todayStr;

            let bgColor = "bg-white border border-gray-200";

            if (checkIn) {
              if (checkIn.verdict === "TERKENDALI")
                bgColor =
                  "bg-tiby-teal-500 border-tiby-teal-600 shadow-[0_0_6px_rgba(27,158,155,0.4)]";
              else if (checkIn.verdict === "PERLU_PERHATIAN")
                bgColor = "bg-amber-400 border-amber-500";
              else bgColor = "bg-red-400 border-red-500";
            } else if (isPast && dateStr >= startDate) {
              bgColor = "bg-red-100 border-red-200";
            } else if (isPast && dateStr < startDate) {
              bgColor = "bg-gray-50 border-gray-100";
            }

            return (
              <motion.div
                key={dateStr}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.01, type: "spring", stiffness: 300 }}
                className={`relative aspect-square rounded-md border flex items-center justify-center text-[10px] font-medium transition-all ${
                  isToday ? "ring-2 ring-tiby-teal-600 ring-offset-1" : ""
                } ${bgColor} ${
                  checkIn || (isPast && dateStr >= startDate)
                    ? "text-white"
                    : "text-gray-400"
                }`}
              >
                {day}
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap justify-center items-center gap-3 mt-4 text-[10px] text-tiby-muted">
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded bg-tiby-teal-500 border border-tiby-teal-600" />{" "}
          Terkendali
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded bg-amber-400 border border-amber-500" />{" "}
          Keluhan
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded bg-red-100 border border-red-200" />{" "}
          Terlewat
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded bg-white border border-gray-200" />{" "}
          Belum
        </div>
      </div>
    </div>
  );
};

export default function PasienOverview() {
  const { data: session } = useSession();
  const user = session?.user as TibyUser | undefined;

  const [history, setHistory] = useState<CheckInHistoryItem[]>([]);
  const [education, setEducation] = useState<EducationItem | null>(null);
  const [facility, setFacility] = useState<FacilityItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function fetchData() {
      try {
        const [historyRes, eduRes] = await Promise.all([
          checkInsApi.getHistory({ limit: 30 }),
          educationApi.getDaily(),
        ]);

        if (active) {
          setHistory(historyRes.items || []);
          if (eduRes.cards && eduRes.cards.length > 0) {
            setEducation(eduRes.cards[0]);
          }
        }

        if (user?.facility_id) {
          const facRes = await facilitiesApi.list({ limit: 100 });
          const facilitiesList = Array.isArray(facRes)
            ? facRes
            : (facRes as { items?: FacilityItem[] }).items || [];

          const currentFacility = facilitiesList.find(
            (f) => f.id === user.facility_id,
          );
          if (active) setFacility(currentFacility || null);
        }
      } catch (err) {
        console.error("Gagal memuat data dashboard:", err);
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchData();
    return () => {
      active = false;
    };
  }, [user?.facility_id]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 11) return "Selamat Pagi";
    if (hour < 15) return "Selamat Siang";
    if (hour < 19) return "Selamat Sore";
    return "Selamat Malam";
  };

  if (loading)
    return <PublicLoading fullScreen message="Menyiapkan dashboard..." />;

  const todayStr = getLocalDateStr(new Date().toISOString());
  const todayCheckIn = history.find(
    (h) => getLocalDateStr(h.submittedAt) === todayStr,
  );
  const isCheckedInToday = !!todayCheckIn;
  const currentStreak = calculateStreak(history);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24 md:pb-10">
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
            {user?.name?.split(" ")[0] || "Sahabat Tiby"} 👋
          </h1>
        </div>
        <div className="w-12 h-12 rounded-full bg-tiby-teal-50 border border-tiby-teal-100 flex items-center justify-center text-tiby-teal-700 font-heading font-bold text-lg shadow-sm">
          {user?.name?.charAt(0).toUpperCase() || "P"}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="bg-gradient-to-br from-tiby-teal-600 to-tiby-teal-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-tiby-teal-600/20 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />

            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-4 text-center sm:text-left">
                <div>
                  <p className="text-tiby-teal-100 font-medium mb-1">
                    Status Hari Ini
                  </p>
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    {isCheckedInToday ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-300" />
                    ) : (
                      <Clock className="w-6 h-6 text-amber-300 animate-pulse" />
                    )}
                    <h2 className="text-2xl font-heading font-bold">
                      {isCheckedInToday ? "Terkendali" : "Belum Check-in"}
                    </h2>
                  </div>
                </div>

                <p className="text-sm text-tiby-teal-50/80 max-w-xs mx-auto sm:mx-0">
                  {isCheckedInToday
                    ? "Hebat! Kamu sudah melapor hari ini. Jangan lupa istirahat yang cukup."
                    : "Bagaimana perasaanmu hari ini? Yuk, lapor minum obatmu sekarang."}
                </p>

                {!isCheckedInToday ? (
                  <Link
                    href="/pasien/check-in"
                    className="inline-flex items-center gap-2 bg-white text-tiby-teal-800 px-6 py-3 rounded-xl font-bold text-sm shadow-sm hover:scale-105 transition-transform"
                  >
                    <Pill className="w-5 h-5" /> Check-in Sekarang
                  </Link>
                ) : (
                  <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-6 py-3 rounded-xl font-bold text-sm border border-white/10">
                    <ShieldCheck className="w-5 h-5" /> Laporan Tersimpan
                  </div>
                )}
              </div>

              {/* ✅ FIX: Langsung panggil MascotAnimation agar dipastikan beranimasi */}
              <div className="shrink-0 flex items-center justify-center">
                <MascotAnimation size={140} className="drop-shadow-2xl" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-lg text-tiby-ink flex items-center gap-2">
                <Pill className="w-5 h-5 text-tiby-teal-600" /> Jadwal
                Pengobatan
              </h3>
              <span className="text-xs font-semibold bg-tiby-teal-50 text-tiby-teal-700 px-3 py-1 rounded-full border border-tiby-teal-100">
                {facility?.name || "Faskes Terdaftar"}
              </span>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-2xs shrink-0">
                  <Pill className="w-5 h-5 text-tiby-teal-600" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-tiby-muted uppercase tracking-wider mb-0.5">
                    Lokasi Faskes
                  </p>
                  <p className="text-sm font-semibold text-tiby-ink">
                    {facility?.district || "-"}
                  </p>
                  <p className="text-xs text-tiby-muted mt-1">
                    {facility?.emergencyPhone || "-"}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-2xs shrink-0">
                  <Clock className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-tiby-muted uppercase tracking-wider mb-0.5">
                    Informasi Terapi
                  </p>
                  <p className="text-sm font-semibold text-tiby-ink">
                    Fase Pengobatan
                  </p>
                  <p className="text-xs text-tiby-muted mt-1">
                    Sesuai anjuran dokter
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <ComplianceCalendar history={history} />
          </motion.div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="relative w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                {currentStreak > 0 && (
                  <motion.div
                    className="absolute inset-0 bg-orange-500/30 rounded-full blur-md"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}
                <Flame
                  className={`w-6 h-6 ${currentStreak > 0 ? "text-orange-500 fill-orange-500" : "text-gray-300"}`}
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-tiby-muted uppercase tracking-wider">
                  Streak Kamu
                </p>
                <p className="font-heading text-xl font-bold text-tiby-ink">
                  {currentStreak} Hari
                </p>
              </div>
            </div>
            <Link
              href="/pasien/riwayat"
              className="text-tiby-teal-600 p-2 hover:bg-tiby-teal-50 rounded-full transition"
            >
              <ChevronRight className="w-5 h-5" />
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-lg text-tiby-ink">
                Edukasi Singkat
              </h3>
              <Link
                href="/pasien/edukasi"
                className="text-xs font-semibold text-tiby-teal-600 hover:text-tiby-teal-700"
              >
                Lihat
              </Link>
            </div>

            {education ? (
              <Link
                href="/pasien/edukasi"
                className="block bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs hover:border-tiby-teal-300 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-tiby-teal-50 flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5 text-tiby-teal-700" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-tiby-ink group-hover:text-tiby-teal-700 transition line-clamp-2">
                      {education.title}
                    </h4>
                    <p className="text-xs text-tiby-muted mt-1 line-clamp-2">
                      {education.summary}
                    </p>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="text-center py-6 bg-white rounded-2xl border border-gray-200">
                <p className="text-xs text-tiby-muted">
                  Belum ada materi edukasi.
                </p>
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs"
          >
            <h3 className="font-heading font-bold text-sm text-tiby-ink mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-tiby-teal-600" /> Tim Pendamping
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div className="w-8 h-8 rounded-full bg-tiby-teal-100 flex items-center justify-center text-tiby-teal-700 shrink-0">
                  <HeartPulse className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-tiby-muted mb-0.5">
                    Fasilitas Kesehatan
                  </p>
                  <p className="text-sm font-semibold text-tiby-ink truncate">
                    {facility?.name || "Faskes Terdaftar"}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
