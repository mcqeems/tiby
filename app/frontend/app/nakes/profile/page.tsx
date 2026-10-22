import type { Metadata } from "next";
import ProfileView from "@/components/profile/profile-view";

export const metadata: Metadata = {
  title: "Profil Nakes",
  description:
    "Kelola informasi akun dan keamanan Anda sebagai Tenaga Kesehatan.",
  robots: "noindex, nofollow",
};

export default function NakesProfilePage() {
  return <ProfileView />;
}
