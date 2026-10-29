import FacilityDetail from "./components/facility-detail";
import { SkeletonRegion, SkeletonRows } from "@/components/ui/skeleton";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Detail Faskes",
  description: "Detail fasilitas kesehatan dan akun yang ditempatkan di sini.",
  robots: "noindex, nofollow",
};

export default function AdminFacilityDetailPage() {
  return <Suspense fallback={<SkeletonRegion label="Memuat..."><SkeletonRows rows={3} /></SkeletonRegion>}>,
        <FacilityDetail />
      </Suspense>;
}
