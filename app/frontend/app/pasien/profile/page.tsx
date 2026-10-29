import ProfileView from "@/components/profile/profile-view";
import { SkeletonRegion, SkeletonRows } from "@/components/ui/skeleton";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profil Saya",
  description: "Kelola informasi akun, kontak darurat, dan keamanan data Anda.",
  robots: "noindex, nofollow",
};

export default function PasienProfilePage() {
  return <Suspense fallback={<SkeletonRegion label="Memuat..."><SkeletonRows rows={3} /></SkeletonRegion>}>,
        <ProfileView />
      </Suspense>;
}
