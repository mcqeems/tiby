import FacilityDetail from "./components/facility-detail";
import type { Metadata } from "next";

/** Auth-gated tree (RoleGuard returns null without a session), so the
    segment cannot be validated for instant navigation. Documented opt-out:
    https://nextjs.org/docs/messages/instant-unrendered-segment */
export const instant = false;

export const metadata: Metadata = {
  title: "Detail Faskes",
  description: "Detail fasilitas kesehatan dan akun yang ditempatkan di sini.",
  robots: "noindex, nofollow",
};

export default function AdminFacilityDetailPage() {
  return <FacilityDetail />;
}
