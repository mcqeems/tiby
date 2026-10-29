import NakesOverview from "./components/nakes-overview";
import { SkeletonRegion, SkeletonRows } from "@/components/ui/skeleton";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard Nakes",
  description: "Pusat kendali Tenaga Kesehatan untuk memantau pasien.",
};

export default function NakesPage() {
  return (
    <div>
      <Suspense
        fallback={
          <SkeletonRegion label="Memuat...">
            <SkeletonRows rows={3} />
          </SkeletonRegion>
        }
      >
        <NakesOverview />
      </Suspense>
    </div>
  );
}
