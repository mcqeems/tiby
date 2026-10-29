import { SkeletonRegion, SkeletonRows } from "@/components/ui/skeleton";
import { Suspense } from "react";
import type { Metadata } from "next";
import PmoPatientsList from "./components/pmo-patients-list";

export const metadata: Metadata = {
  title: "Pasien Binaan PMO",
  description:
    "Pantau dan dampingi pasien yang menjadi tanggung jawab Anda sebagai PMO.",
  robots: "noindex, nofollow", 
};

export default function PmoPatientsPage() {
  return <Suspense fallback={<SkeletonRegion label="Memuat..."><SkeletonRows rows={3} /></SkeletonRegion>}>,
        <PmoPatientsList />
      </Suspense>;
}
