import PmoOverview from "./components/pmo-overview";
import type { Metadata } from "next";

/** Auth-gated tree (RoleGuard returns null without a session), so the
    segment cannot be validated for instant navigation. Documented opt-out:
    https://nextjs.org/docs/messages/instant-unrendered-segment */
export const instant = false;

export const metadata: Metadata = {
  title: "Beranda PMO",
  description:
    "Dashboard Pengawas Menelan Obat (PMO) untuk memantau pasien binaan.",
};

export default function PmoPage() {
  return (
    <div className="space-y-6">

      <PmoOverview />
    </div>
  );
}
