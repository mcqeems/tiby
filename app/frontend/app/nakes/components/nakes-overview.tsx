"use client";

import Link from "next/link";
import { Users, UserPlus, CheckCircle2, Clock, ArrowRight } from "lucide-react";

export default function NakesOverview() {
  return (
    <div className="space-y-6">
      {/* Statistik Harian */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-tiby-muted">
              Total Pasien Aktif
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-tiby-teal-50 text-tiby-teal-700">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <p className="font-heading text-2xl font-semibold text-tiby-ink mt-3">
            12
          </p>
          <p className="text-[11px] text-tiby-muted mt-1">
            Terdaftar dalam pemantauan aktif
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-tiby-muted">
              Sudah Minum Hari Ini
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-green-700">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <p className="font-heading text-2xl font-semibold text-tiby-ink mt-3">
            9
          </p>
          <p className="text-[11px] text-green-700 mt-1">
            75% tingkat kepatuhan hari ini
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-tiby-muted">
              Belum Laporan / Terlambat
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <p className="font-heading text-2xl font-semibold text-tiby-ink mt-3">
            3
          </p>
          <p className="text-[11px] text-amber-700 mt-1">
            Memerlukan tindak lanjut PMO
          </p>
        </div>
      </div>

      {/* Menu Pintasan Utama */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/nakes/pasien"
          className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-6 shadow-2xs hover:border-tiby-teal-600 transition group"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-tiby-teal-50 text-tiby-teal-700 group-hover:bg-tiby-teal-600 group-hover:text-white transition">
                <Users className="w-5 h-5" />
              </span>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-tiby-teal-700 transition" />
            </div>
            <h2 className="font-heading text-base font-semibold text-tiby-ink">
              Kelola Daftar Pasien
            </h2>
            <p className="text-xs text-tiby-muted mt-1 leading-relaxed">
              Lihat detail profil klinis pasien, cek riwayat minum obat harian,
              atau reset password akun pasien dan PMO.
            </p>
          </div>
          <span className="mt-4 inline-block text-xs font-semibold text-tiby-teal-700">
            Buka Daftar Pasien &rarr;
          </span>
        </Link>

        <Link
          href="/nakes/onboarding"
          className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-6 shadow-2xs hover:border-tiby-teal-600 transition group"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-tiby-teal-50 text-tiby-teal-700 group-hover:bg-tiby-teal-600 group-hover:text-white transition">
                <UserPlus className="w-5 h-5" />
              </span>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-tiby-teal-700 transition" />
            </div>
            <h2 className="font-heading text-base font-semibold text-tiby-ink">
              Onboarding Pasien Baru
            </h2>
            <p className="text-xs text-tiby-muted mt-1 leading-relaxed">
              Daftarkan pasien baru secara manual maupun otomatis via pindai
              kartu pengobatan (OCR) dan terbitkan akun PMO.
            </p>
          </div>
          <span className="mt-4 inline-block text-xs font-semibold text-tiby-teal-700">
            Mulai Pendaftaran &rarr;
          </span>
        </Link>
      </div>
    </div>
  );
}
