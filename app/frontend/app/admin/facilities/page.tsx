import FacilityManager from "./components/facility-manager";
import { SkeletonRegion, SkeletonRows } from "@/components/ui/skeleton";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Master Fasilitas Kesehatan",
  description: "Kelola data Puskesmas dan Klinik di seluruh Indonesia.",
  robots: "noindex, nofollow",
};

export default function AdminFacilitiesPage() {
  return (
    <div className="">
      <Suspense fallback={<SkeletonRegion label="Memuat..."><SkeletonRows rows={3} /></SkeletonRegion>}>,
        <FacilityManager />
      </Suspense>
    </div>
  );
}
