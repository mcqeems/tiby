import EducationManager from "@/components/education/education-manager";
import type { Metadata } from "next";

/** Auth-gated tree (RoleGuard returns null without a session), so the
    segment cannot be validated for instant navigation. Documented opt-out:
    https://nextjs.org/docs/messages/instant-unrendered-segment */
export const instant = false;

export const metadata: Metadata = {
  title: "Kelola Edukasi",
  description: "Buat dan kelola materi edukasi untuk pasien.",
  robots: "noindex, nofollow",
};

export default function NakesEdukasiPage() {
  return (
    <div className="">
      <EducationManager />
    </div>
  );
}
