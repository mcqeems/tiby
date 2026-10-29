import RiwayatView from "./components/riwayat-view";
import { SkeletonRegion, SkeletonRows } from "@/components/ui/skeleton";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Riwayat Check-In",
  description:
    "Lihat kalender kepatuhan dan riwayat laporan harian pengobatan Anda.",
  robots: "noindex, nofollow",
};

export default function RiwayatTerapiPage() {
  return <Suspense fallback={<SkeletonRegion label="Memuat..."><SkeletonRows rows={3} /></SkeletonRegion>}>,
        <RiwayatView />
      </Suspense>;
}
