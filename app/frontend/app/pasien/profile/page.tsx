import ProfileView from "@/components/profile/profile-view";
import type { Metadata } from "next";

/** Auth-gated tree (RoleGuard returns null without a session), so the
    segment cannot be validated for instant navigation. Documented opt-out:
    https://nextjs.org/docs/messages/instant-unrendered-segment */
export const instant = false;

export const metadata: Metadata = {
  title: "Profil Saya",
  description: "Kelola informasi akun, kontak darurat, dan keamanan data Anda.",
  robots: "noindex, nofollow",
};

export default function PasienProfilePage() {
  return <ProfileView />;
}
