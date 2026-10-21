"use client";

import Link from "next/link";
import { Pill, Clock, ShieldCheck, ArrowRight, Calendar } from "lucide-react";

export default function PasienOverview() {
  const todayStr = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Banner Status Hari Ini */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-tiby-teal-700 bg-tiby-teal-50 border border-tiby-teal-100 px-3 py-1 rounded-lg">
              <Calendar className="w-3.5 h-3.5" />
              <span>{todayStr}</span>
            </span>
            <h2 className="font-heading text-lg font-semibold text-tiby-ink pt-1">
              Jangan Lupa Minum Obat Hari Ini
            </h2>
            <p className="text-xs text-tiby-muted max-w-md leading-relaxed">
              Disiplin meminum obat sesuai dosis setiap hari adalah kunci utama
              kesembuhan Anda.
            </p>
          </div>

          <Link
            href="/pasien/check-in"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-tiby-teal-600 px-5 py-2.5 text-xs font-semibold text-white shadow-2xs hover:bg-tiby-teal-700 transition shrink-0"
          >
            <Pill className="w-4 h-4" />
            <span>Check-in Sekarang</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Pintasan Menu */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/pasien/check-in"
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-2xs hover:border-tiby-teal-600 transition group"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-tiby-teal-50 text-tiby-teal-700 group-hover:bg-tiby-teal-600 group-hover:text-white transition">
              <Pill className="w-5 h-5" />
            </span>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-tiby-teal-700 transition" />
          </div>
          <h3 className="font-heading text-sm font-semibold text-tiby-ink">
            Check-in Minum Obat
          </h3>
          <p className="text-xs text-tiby-muted mt-1 leading-relaxed">
            Laporkan status kepatuhan minum obat harian serta keluhan efek
            samping jika ada.
          </p>
        </Link>

        <Link
          href="/pasien/riwayat"
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-2xs hover:border-tiby-teal-600 transition group"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-tiby-teal-50 text-tiby-teal-700 group-hover:bg-tiby-teal-600 group-hover:text-white transition">
              <Clock className="w-5 h-5" />
            </span>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-tiby-teal-700 transition" />
          </div>
          <h3 className="font-heading text-sm font-semibold text-tiby-ink">
            Riwayat & Catatan Terapi
          </h3>
          <p className="text-xs text-tiby-muted mt-1 leading-relaxed">
            Lihat rekam jejak kepatuhan dan riwayat laporan pengobatan Anda
            sebelumnya.
          </p>
        </Link>
      </div>

      {/* Informasi Pendampingan */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs flex items-start gap-3.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-tiby-teal-50 text-tiby-teal-700">
          <ShieldCheck className="w-4 h-4" />
        </span>
        <div>
          <h4 className="font-heading text-xs font-semibold text-tiby-ink">
            Terhubung dengan PMO & Tenaga Kesehatan
          </h4>
          <p className="text-xs text-tiby-muted mt-0.5 leading-relaxed">
            Setiap laporan check-in Anda langsung tercatat di sistem klinis
            Puskesmas/RS untuk memastikan pengobatan berjalan aman.
          </p>
        </div>
      </div>
    </div>
  );
}
