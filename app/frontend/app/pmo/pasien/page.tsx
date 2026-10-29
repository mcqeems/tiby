import type { Metadata } from "next";
import PmoPatientsList from "./components/pmo-patients-list";

/** Auth-gated tree (RoleGuard returns null without a session), so the
    segment cannot be validated for instant navigation. Documented opt-out:
    https://nextjs.org/docs/messages/instant-unrendered-segment */
export const instant = false;

export const metadata: Metadata = {
  title: "Pasien Binaan PMO",
  description:
    "Pantau dan dampingi pasien yang menjadi tanggung jawab Anda sebagai PMO.",
  robots: "noindex, nofollow", 
};

export default function PmoPatientsPage() {
  return <PmoPatientsList />;
}
