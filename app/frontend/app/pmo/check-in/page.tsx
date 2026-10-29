import CheckInView from "@/app/pasien/check-in/components/check-in-view";
import PublicLoading from "@/components/ui/public-loading";
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
      <Suspense fallback={<PublicLoading message="Memuat check-in..." />}>
        <CheckInView role="PMO" />
      </Suspense>
    </div>
  );
}
