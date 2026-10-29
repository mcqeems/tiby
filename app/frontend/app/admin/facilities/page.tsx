import FacilityManager from "./components/facility-manager";
import type { Metadata } from "next";

/** Auth-gated tree (RoleGuard returns null without a session), so the
    segment cannot be validated for instant navigation. Documented opt-out:
    https://nextjs.org/docs/messages/instant-unrendered-segment */
export const instant = false;

export const metadata: Metadata = {
  title: "Master Fasilitas Kesehatan",
  description: "Kelola data Puskesmas dan Klinik di seluruh Indonesia.",
  robots: "noindex, nofollow",
};

export default function AdminFacilitiesPage() {
  return (
    <div className="">
      <FacilityManager />
    </div>
  );
}
