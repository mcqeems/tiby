import PmoOverview from "./components/pmo-overview";
import { SkeletonRegion, SkeletonRows } from "@/components/ui/skeleton";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Beranda PMO",
  description:
    "Dashboard Pengawas Menelan Obat (PMO) untuk memantau pasien binaan.",
};

export default function PmoPage() {
  return (
    <div className="space-y-6">
      <Suspense
        fallback={
          <SkeletonRegion label="Memuat...">
            <SkeletonRows rows={3} />
          </SkeletonRegion>
        }
      >
        <PmoOverview />
      </Suspense>
    </div>
  );
}
