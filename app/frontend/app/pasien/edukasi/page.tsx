import EducationView from "./components/education-view";
import { SkeletonRegion, SkeletonRows } from "@/components/ui/skeleton";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edukasi Harian",
  description:
    "Baca materi edukasi kesehatan dan tips pengobatan dari Kemenkes dan WHO.",
};

export default function PasienEdukasiPage() {
  return <Suspense fallback={<SkeletonRegion label="Memuat..."><SkeletonRows rows={3} /></SkeletonRegion>}>,
        <EducationView />
      </Suspense>;
}
