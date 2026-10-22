import type { Metadata } from "next";
import ProfileView from "@/components/profile/profile-view";

export const metadata: Metadata = {
  title: "Profil Admin",
  description: "Kelola informasi akun Administrator Pusat.",
  robots: "noindex, nofollow",
};

export default function AdminProfilePage() {
  return <ProfileView />;
}
