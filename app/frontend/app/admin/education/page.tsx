import EducationManager from "@/components/education/education-manager";
import type { Metadata } from "next";

/** Auth-gated tree (RoleGuard returns null without a session), so the
    segment cannot be validated for instant navigation. Documented opt-out:
    https://nextjs.org/docs/messages/instant-unrendered-segment */
export const instant = false;

export const metadata: Metadata = {
  title: "Kelola Edukasi",
  description: "Kelola materi edukasi global yang berlaku untuk semua faskes.",
  robots: "noindex, nofollow",
};

export default function AdminEducationPage() {
  return <EducationManager scope="admin" />;
}
