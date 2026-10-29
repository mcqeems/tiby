import CheckInView from "./components/check-in-view";
import PublicLoading from "@/components/ui/public-loading";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Check-in Harian",
  description: "Laporkan kondisi dan kepatuhan minum obat Anda hari ini.",
  robots: "noindex, nofollow",
};

export default function PasienCheckInPage() {
  return (
    <div className="flex h-full w-full flex-col bg-tiby-white">
      {/* useSearchParams() in CheckInView needs a Suspense boundary so the
          segment can pre-render for instant navigation. */}
      <Suspense fallback={<PublicLoading message="Memuat check-in..." />}>
        <CheckInView role="PASIEN" />
      </Suspense>
    </div>
  );
}
