
import NakesOverview from "./components/nakes-overview";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard Nakes",
  description: "Pusat kendali Tenaga Kesehatan untuk memantau pasien TBC.",
};

export default function NakesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-xl sm:text-2xl font-semibold text-tiby-ink">
          Beranda Tenaga Kesehatan
        </h1>
        <p className="mt-0.5 text-xs text-tiby-muted">
          Ringkasan pemantauan kepatuhan terapi pasien dan akses cepat layanan
          klinis.
        </p>
      </div>

      <NakesOverview />
    </div>
  );
}
