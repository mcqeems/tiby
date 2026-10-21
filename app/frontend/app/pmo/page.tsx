"use client";

import PmoOverview from "./components/pmo-overview";

export default function PmoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-xl sm:text-2xl font-semibold text-tiby-ink">
          Beranda Pengawas (PMO)
        </h1>
        <p className="mt-0.5 text-xs text-tiby-muted">
          Pantau perkembangan terapi dan bantu kelancaran laporan harian pasien
          binaan Anda.
        </p>
      </div>

      <PmoOverview />
    </div>
  );
}
