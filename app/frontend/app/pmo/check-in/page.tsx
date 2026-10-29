import CheckInView from "@/app/pasien/check-in/components/check-in-view";
import { SkeletonRegion, SkeletonRows } from "@/components/ui/skeleton";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Check-in Mewakili Pasien",
  description:
    "Laporkan kondisi pasien yang Anda dampingi melalui fitur check-in.",
  robots: "noindex, nofollow",
};

export default function PmoCheckInPage() {
  return (
    <div className="h-full bg-tiby-white">
      {/* useSearchParams() in CheckInView needs a Suspense boundary so the
          segment can pre-render for instant navigation. */}
      <Suspense
        fallback={
          <SkeletonRegion label="Memuat...">
            <SkeletonRows rows={3} />
          </SkeletonRegion>
        }
      >
        <CheckInView role="PMO" />
      </Suspense>
    </div>
  );
}
