"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
} from "lucide-react";

export default function TreatmentCalendar() {
  // Menggunakan waktu saat ini sebagai default
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Nama bulan dan hari
  const monthNames = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  const dayNames = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

  // Fungsi navigasi bulan
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Logika kalender
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Mendapatkan hari pertama di bulan ini (0 = Minggu, 1 = Senin, dst)
  // Kita ubah agar Senin = 0, Minggu = 6
  let firstDay = new Date(year, month, 1).getDay();
  firstDay = firstDay === 0 ? 6 : firstDay - 1;

  // MOCK DATA: Simulasi status per tanggal (1-30/31)
  // Di aplikasi nyata, ini diambil dari API riwayat
  const getStatusForDay = (day: number) => {
    // Simulasi: Tanggal 1-10 sukses, 11-12 bolos, 13-20 sukses, 21 ada keluhan
    if (day < 10) return "success";
    if (day === 11 || day === 12) return "missed";
    if (day === 21) return "warning";
    if (day < new Date().getDate()) return "success"; // Hari yang sudah lewat dianggap sukses
    return "future"; // Hari yang belum terjadi
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs">
      {/* Header Kalender */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-heading font-bold text-lg text-tiby-ink">
          Kalender Kepatuhan
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-tiby-muted transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-tiby-ink min-w-[100px] text-center">
            {monthNames[month]} {year}
          </span>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-tiby-muted transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid Hari */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((day) => (
          <div
            key={day}
            className="text-center text-[11px] font-bold text-tiby-muted uppercase py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Grid Tanggal */}
      <div className="grid grid-cols-7 gap-1.5">
        {/* Slot Kosong untuk hari sebelum tanggal 1 */}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="h-10 sm:h-12 rounded-xl bg-gray-50/50"
          />
        ))}

        {/* Tanggal 1 sampai akhir bulan */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const status = getStatusForDay(day);
          const isToday =
            day === new Date().getDate() &&
            month === new Date().getMonth() &&
            year === new Date().getFullYear();

          // Styling berdasarkan status
          let bgClass = "bg-white border border-gray-100";
          let textClass = "text-tiby-ink";

          if (status === "success") {
            bgClass = "bg-tiby-teal-50 border-tiby-teal-200";
            textClass = "text-tiby-teal-700 font-bold";
          } else if (status === "missed") {
            bgClass = "bg-red-50 border-red-200";
            textClass = "text-red-700 font-bold";
          } else if (status === "warning") {
            bgClass = "bg-amber-50 border-amber-200";
            textClass = "text-amber-700 font-bold";
          } else if (status === "future") {
            bgClass = "bg-white border-dashed border-gray-200";
            textClass = "text-gray-400";
          }

          return (
            <div
              key={day}
              className={`relative flex flex-col items-center justify-center h-10 sm:h-12 rounded-xl transition-all ${bgClass} ${
                isToday ? "ring-2 ring-tiby-teal-600 ring-offset-2" : ""
              }`}
            >
              <span className={`text-sm ${textClass}`}>{day}</span>

              {/* Titik indikator kecil di bawah angka */}
              {status === "success" && (
                <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-tiby-teal-600" />
              )}
              {status === "missed" && (
                <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-red-500" />
              )}
              {status === "warning" && (
                <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-amber-500" />
              )}
            </div>
          );
        })}
      </div>

      {/* Legend / Keterangan */}
      <div className="flex flex-wrap items-center justify-center gap-4 mt-6 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-tiby-teal-50 border border-tiby-teal-200 flex items-center justify-center">
            <div className="w-1 h-1 bg-tiby-teal-600 rounded-full" />
          </div>
          <span className="text-[11px] font-medium text-tiby-muted">
            Terkendali
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
            <div className="w-1 h-1 bg-amber-500 rounded-full" />
          </div>
          <span className="text-[11px] font-medium text-tiby-muted">
            Ada Keluhan
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
            <div className="w-1 h-1 bg-red-500 rounded-full" />
          </div>
          <span className="text-[11px] font-medium text-tiby-muted">
            Terlewat
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-white border border-dashed border-gray-300" />
          <span className="text-[11px] font-medium text-tiby-muted">Belum</span>
        </div>
      </div>
    </div>
  );
}
