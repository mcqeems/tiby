import ProfileView from "@/components/profile/profile-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profil Saya",
  description: "Kelola informasi akun, kontak darurat, dan keamanan data Anda.",
  robots: "noindex, nofollow",
};

export default function AdminProfilePage() {
  return (
    <div className="min-h-screen">
      <ProfileView />
    </div>
  );
}
