import PmoOverview from "./components/pmo-overview";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Beranda PMO",
  description:
    "Dashboard Pengawas Menelan Obat (PMO) untuk memantau pasien binaan.",
};

export default function PmoPage() {
  return (
    <div className="space-y-6">

      <PmoOverview />
    </div>
  );
}
