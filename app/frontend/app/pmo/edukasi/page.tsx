import EducationView from "@/app/pasien/edukasi/components/education-view";
import type { Metadata } from "next";

/** Auth-gated tree (RoleGuard returns null without a session), so the
    segment cannot be validated for instant navigation. Documented opt-out:
    https://nextjs.org/docs/messages/instant-unrendered-segment */
export const instant = false;

export const metadata: Metadata = {
  title: "Edukasi Harian",
  description:
    "Baca materi edukasi kesehatan dan tips pengobatan dari Kemenkes dan WHO.",
};
export default function PmoEdukasiPage() {
  return <EducationView role="PMO" />;
}
