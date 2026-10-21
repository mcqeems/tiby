"use client";

import Link from "next/link";
import { Users, CheckCircle2, ArrowRight } from "lucide-react";

export default function PmoOverview() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-tiby-muted">
              Pasien Binaan Terhubung
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-tiby-teal-50 text-tiby-teal-700">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <p className="font-heading text-2xl font-semibold text-tiby-ink mt-3">
            1 Pasien
          </p>
          <p className="text-[11px] text-tiby-muted mt-1">
            Dalam pendampingan aktif Anda
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-tiby-muted">
              Status Laporan Hari Ini
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-green-700">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <p className="font-heading text-2xl font-semibold text-tiby-ink mt-3">
            Terkendali
          </p>
          <p className="text-[11px] text-green-700 mt-1">
            Seluruh dosis harian telah terpenuhi
          </p>
        </div>
      </div>

      <Link
        href="/pmo/pasien"
        className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-6 shadow-2xs hover:border-tiby-teal-600 transition group"
      >
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-tiby-teal-50 text-tiby-teal-700 group-hover:bg-tiby-teal-600 group-hover:text-white transition">
            <Users className="w-5 h-5" />
          </span>
          <div>
            <h2 className="font-heading text-base font-semibold text-tiby-ink">
              Daftar Pasien Binaan & Check-in Wakil
            </h2>
            <p className="text-xs text-tiby-muted mt-1">
              Lihat detail kepatuhan pasien atau bantu laporkan check-in harian
              atas nama pasien.
            </p>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-tiby-teal-700 transition shrink-0" />
      </Link>
    </div>
  );
}
