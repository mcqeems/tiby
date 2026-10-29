import { SkeletonRegion, SkeletonRows } from "@/components/ui/skeleton";
import { Suspense } from "react";
import type { Metadata } from "next";
import ProfileView from "@/components/profile/profile-view";

export const metadata: Metadata = {
  title: "Profil Admin",
  description: "Kelola informasi akun Administrator Pusat.",
  robots: "noindex, nofollow",
};

export default function AdminProfilePage() {
  return <Suspense fallback={<SkeletonRegion label="Memuat..."><SkeletonRows rows={3} /></SkeletonRegion>}>,
        <ProfileView />
      </Suspense>;
}
