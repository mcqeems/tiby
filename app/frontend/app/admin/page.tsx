import type { Metadata } from "next";
import AdminOverview from "./components/admin-overview";

/** Auth-gated tree (RoleGuard returns null without a session), so the
    segment cannot be validated for instant navigation. Documented opt-out:
    https://nextjs.org/docs/messages/instant-unrendered-segment */
export const instant = false;

export const metadata: Metadata = {
  title: "Dashboard Admin",
  description:
    "Pusat komando Super Admin untuk mengelola fasilitas kesehatan dan akun nakes.",
  robots: "noindex, nofollow",
};

export default function AdminOverviewPage() {
  return (
    <div>
      <AdminOverview/>
    </div>
  );
}
