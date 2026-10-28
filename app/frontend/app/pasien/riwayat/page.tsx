import RiwayatView from "./components/riwayat-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Riwayat Check-In",
  description:
    "Lihat kalender kepatuhan dan riwayat laporan harian pengobatan Anda.",
  robots: "noindex, nofollow",
};

export default function RiwayatTerapiPage() {
  return <RiwayatView />;
}
