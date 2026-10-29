import EducationManager from "@/components/education/education-manager";
import { SkeletonRegion, SkeletonRows } from "@/components/ui/skeleton";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kelola Edukasi",
  description: "Buat dan kelola materi edukasi untuk pasien.",
  robots: "noindex, nofollow",
};

export default function NakesEdukasiPage() {
  return (
    <div className="">
      <Suspense fallback={<SkeletonRegion label="Memuat..."><SkeletonRows rows={3} /></SkeletonRegion>}>,
        <EducationManager />
      </Suspense>
    </div>
  );
}
