
import NakesOverview from "./components/nakes-overview";
import type { Metadata } from "next";

/** Auth-gated tree (RoleGuard returns null without a session), so the
    segment cannot be validated for instant navigation. Documented opt-out:
    https://nextjs.org/docs/messages/instant-unrendered-segment */
export const instant = false;

export const metadata: Metadata = {
  title: "Dashboard Nakes",
  description: "Pusat kendali Tenaga Kesehatan untuk memantau pasien.",
};

export default function NakesPage() {
  return (
    <div>
    

      <NakesOverview />
    </div>
  );
}
