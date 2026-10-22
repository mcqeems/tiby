import type { Metadata } from "next";
import ProfileView from "@/components/profile/profile-view";

export const metadata: Metadata = {
  title: "Profil PMO",
  description:
    "Kelola informasi akun dan keamanan Anda sebagai Pengawas Menelan Obat.",
  robots: "noindex, nofollow",
};

export default function PmoProfilePage() {
  return <ProfileView />;
}
