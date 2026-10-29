import { SkeletonRegion, SkeletonRows } from "@/components/ui/skeleton";
import { Suspense } from "react";
import type { Metadata } from "next";
import AdminOverview from "./components/admin-overview";

export const metadata: Metadata = {
  title: "Dashboard Admin",
  description:
    "Pusat komando Super Admin untuk mengelola fasilitas kesehatan dan akun nakes.",
  robots: "noindex, nofollow",
};

export default function AdminOverviewPage() {
  return (
    <div>
      <Suspense fallback={<SkeletonRegion label="Memuat..."><SkeletonRows rows={3} /></SkeletonRegion>}>,
        <AdminOverview/>
      </Suspense>
    </div>
  );
}
