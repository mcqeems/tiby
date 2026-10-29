import PatientsTable from "./components/patients-table";
import { SkeletonRegion, SkeletonRows } from "@/components/ui/skeleton";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Daftar Pasien Nakes",
  description:
    "Pantau status risiko dan kepatuhan pasien di fasilitas kesehatan Anda.",
  robots: "noindex, nofollow",
};

export default function NakesPasienPage() {
  return (
    <div className="space-y-6">
      

      <Suspense fallback={<SkeletonRegion label="Memuat..."><SkeletonRows rows={3} /></SkeletonRegion>}>,
        <PatientsTable />
      </Suspense>
    </div>
  );
}
