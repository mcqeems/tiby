import GuidanceView from "@/components/guidance/guidance-view";
import { SkeletonRegion, SkeletonRows } from "@/components/ui/skeleton";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tanya Pandu",
  description:
    "Tanyakan hal umum seputar pengobatan, dijawab dari panduan resmi Kemenkes/WHO.",
  robots: "noindex, nofollow",
};

export default function PasienGuidancePage() {
  return (
    <div className="mx-auto max-w-4xl">
      {/* useSession() in the tree suspends pre-render without data; the
          boundary keeps the segment eligible for instant navigation. */}
      <Suspense fallback={<SkeletonRegion label="Memuat..."><SkeletonRows rows={3} /></SkeletonRegion>}>,
        <GuidanceView />
      </Suspense>
    </div>
  );
}
