import UserManager from "./components/user-manager";
import { SkeletonRegion, SkeletonRows } from "@/components/ui/skeleton";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manajemen Akun",
  description: "Kelola akun Tenaga Kesehatan (Nakes) tiap Faskes.",
  robots: "noindex, nofollow",
};

export default function AdminUsersPage() {
  return <Suspense fallback={<SkeletonRegion label="Memuat..."><SkeletonRows rows={3} /></SkeletonRegion>}>,
        <UserManager />
      </Suspense>;
}
