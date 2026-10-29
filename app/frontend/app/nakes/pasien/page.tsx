import PatientsTable from "./components/patients-table";
import type { Metadata } from "next";

/** Auth-gated tree (RoleGuard returns null without a session), so the
    segment cannot be validated for instant navigation. Documented opt-out:
    https://nextjs.org/docs/messages/instant-unrendered-segment */
export const instant = false;

export const metadata: Metadata = {
  title: "Daftar Pasien Nakes",
  description:
    "Pantau status risiko dan kepatuhan pasien di fasilitas kesehatan Anda.",
  robots: "noindex, nofollow",
};

export default function NakesPasienPage() {
  return (
    <div className="space-y-6">
      

      <PatientsTable />
    </div>
  );
}
