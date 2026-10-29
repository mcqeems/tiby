import type { Metadata } from "next";
import ProfileView from "@/components/profile/profile-view";

/** Auth-gated tree (RoleGuard returns null without a session), so the
    segment cannot be validated for instant navigation. Documented opt-out:
    https://nextjs.org/docs/messages/instant-unrendered-segment */
export const instant = false;

export const metadata: Metadata = {
  title: "Profil Nakes",
  description:
    "Kelola informasi akun dan keamanan Anda sebagai Tenaga Kesehatan.",
  robots: "noindex, nofollow",
};

export default function NakesProfilePage() {
  return <ProfileView />;
}
