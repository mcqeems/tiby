"use client";

import PasienOverview from "./components/pasien-overview";

export default function PasienPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-xl sm:text-2xl font-semibold text-tiby-ink">
          Beranda Pasien
        </h1>
        <p className="mt-0.5 text-xs text-tiby-muted">
          Pantau jadwal terapi harian dan laporkan kepatuhan minum obat Anda.
        </p>
      </div>

      <PasienOverview />
    </div>
  );
}
