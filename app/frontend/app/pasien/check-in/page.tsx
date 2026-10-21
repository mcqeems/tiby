"use client";

import DailyCheckinForm from "./components/daily-checkin-form";

export default function PasienCheckinPage() {
  return (
    <div className="space-y-6">
      {/* Judul ditulis manual secara langsung di sini */}
      <div>
        <h1 className="font-heading text-xl sm:text-2xl font-semibold text-tiby-ink">
          Check-in Minum Obat Harian
        </h1>
        <p className="mt-0.5 text-xs text-tiby-muted">
          Laporkan status kepatuhan minum obat dan keluhan harian Anda di sini.
        </p>
      </div>

      <div className="max-w-2xl mx-auto">
        <DailyCheckinForm />
      </div>
    </div>
  );
}
