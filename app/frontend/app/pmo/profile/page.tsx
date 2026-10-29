import { SkeletonRegion, SkeletonRows } from "@/components/ui/skeleton";
import { Suspense } from "react";
import type { Metadata } from "next";
import ProfileView from "@/components/profile/profile-view";

export const metadata: Metadata = {
  title: "Profil PMO",
  description:
    "Kelola informasi akun dan keamanan Anda sebagai Pengawas Menelan Obat.",
  robots: "noindex, nofollow",
};

export default function PmoProfilePage() {
  return <Suspense fallback={<SkeletonRegion label="Memuat..."><SkeletonRows rows={3} /></SkeletonRegion>}>,
        <ProfileView />
      </Suspense>;
}
