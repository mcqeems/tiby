import { SkeletonRegion, SkeletonRows } from "@/components/ui/skeleton";
import { Suspense } from "react";
import type { Metadata } from "next";
import ProfileView from "@/components/profile/profile-view";

export const metadata: Metadata = {
  title: "Profil Nakes",
  description:
    "Kelola informasi akun dan keamanan Anda sebagai Tenaga Kesehatan.",
  robots: "noindex, nofollow",
};

export default function NakesProfilePage() {
  return <Suspense fallback={<SkeletonRegion label="Memuat..."><SkeletonRows rows={3} /></SkeletonRegion>}>,
        <ProfileView />
      </Suspense>;
}
