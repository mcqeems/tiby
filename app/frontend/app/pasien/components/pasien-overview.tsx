"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession, type TibyUser } from "@/lib/auth-client";
import {
  Pill,
  Flame,
  BookOpen,
  ChevronRight,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from "lucide-react";

export default function PasienOverview() {
  const { data: session } = useSession();
  const user = session?.user as TibyUser | undefined;

 
  const isCheckedInToday = false;
  const currentStreak = 12;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 11) return "Selamat Pagi";
    if (hour < 15) return "Selamat Siang";
    if (hour < 19) return "Selamat Sore";
    return "Selamat Malam";
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24 md:pb-10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-tiby-muted font-medium mb-1">
            {getGreeting()},
          </p>
          <h1 className="font-heading text-2xl font-bold text-tiby-ink">
            {user?.name?.split(" ")[0] || "Sahabat Tiby"} 👋
          </h1>
        </div>
        <div className="w-12 h-12 rounded-full bg-tiby-teal-50 border border-tiby-teal-100 flex items-center justify-center text-tiby-teal-700 font-heading font-bold text-lg">
          {user?.name?.charAt(0).toUpperCase() || "P"}
        </div>
      </div>

      <div className="bg-linear-to-br from-tiby-teal-600 to-tiby-teal-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-tiby-teal-600/20 relative overflow-hidden">
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
                className="inline-flex items-center gap-2 bg-white text-black  px-6 py-3 rounded-xl font-bold text-sm shadow-sm hover:scale-105 transition-transform"
              >
                <Pill className="w-5 h-5 " />
                Check-in Sekarang
              </Link>
            ) : (
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-6 py-3 rounded-xl font-bold text-sm border border-white/10">
                <ShieldCheck className="w-5 h-5" />
                Laporan Tersimpan
              </div>
            )}
          </div>

          {/* Maskot Pandu */}
          <div className="relative w-32 h-32 sm:w-40 sm:h-40 shrink-0">
            <Image
              src={
                isCheckedInToday
                  ? "/mascot/happy/happy.png"
                  : "/mascot/idle/idle.png"
              }
              alt="Pandu"
              fill
              className="object-contain drop-shadow-2xl"
            />
          </div>
        </div>
      </div>

      {/* 3. KARTU STREAK (API) */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center">
            <Flame className="w-6 h-6 text-amber-500 fill-amber-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-tiby-muted uppercase tracking-wider">
              Streak Minum Obat
            </p>
            <p className="font-heading text-xl font-bold text-tiby-ink">
              {currentStreak} Hari Berturut-turut
            </p>
          </div>
        </div>
        <Link
          href="/pasien/riwayat"
          className="text-tiby-teal-600 p-2 hover:bg-tiby-teal-50 rounded-full transition"
        >
          <ChevronRight className="w-5 h-5" />
        </Link>
      </div>

      {/* 4. EDUKASI HARI INI */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-bold text-lg text-tiby-ink">
            Edukasi Singkat
          </h3>
          <Link
            href="/pasien/edukasi"
            className="text-xs font-semibold text-tiby-teal-600 hover:text-tiby-teal-700"
          >
            Lihat Semua
          </Link>
        </div>

        <Link
          href="/pasien/edukasi"
          className="block bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs hover:border-tiby-teal-300 hover:shadow-sm transition-all group"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-tiby-teal-50 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-tiby-teal-700" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-tiby-ink group-hover:text-tiby-teal-700 transition">
                Mengapa Obat Harus Diminum Tanpa Putus?
              </h4>
              <p className="text-xs text-tiby-muted mt-1 line-clamp-2">
                Konsistensi adalah kunci utama kesembuhan total dan pencegahan
                kekebalan obat.
              </p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
