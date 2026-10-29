import EducationManager from "@/components/education/education-manager";
import { SkeletonRegion, SkeletonRows } from "@/components/ui/skeleton";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kelola Edukasi",
  description: "Kelola materi edukasi global yang berlaku untuk semua faskes.",
  robots: "noindex, nofollow",
};

export default function AdminEducationPage() {
  return <Suspense fallback={<SkeletonRegion label="Memuat..."><SkeletonRows rows={3} /></SkeletonRegion>}>,
        <EducationManager scope="admin" />
      </Suspense>;
}
