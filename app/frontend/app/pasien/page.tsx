import PasienOverview from "./components/pasien-overview";
import { SkeletonRegion, SkeletonRows } from "@/components/ui/skeleton";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Beranda Pasien",
  description:
    "Pantau status pengobatan dan lakukan check-in harian Anda dengan mudah di Tiby.",
};

export default function PasienPage() {
  return (
    <div className="space-y-6">
    
      <Suspense fallback={<SkeletonRegion label="Memuat..."><SkeletonRows rows={3} /></SkeletonRegion>}>,
        <PasienOverview />
      </Suspense>
    </div>
  );
}
