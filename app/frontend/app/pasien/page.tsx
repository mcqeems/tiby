import PasienOverview from "./components/pasien-overview";
import type { Metadata } from "next";

/** Auth-gated tree (RoleGuard returns null without a session), so the
    segment cannot be validated for instant navigation. Documented opt-out:
    https://nextjs.org/docs/messages/instant-unrendered-segment */
export const instant = false;

export const metadata: Metadata = {
  title: "Beranda Pasien",
  description:
    "Pantau status pengobatan dan lakukan check-in harian Anda dengan mudah di Tiby.",
};

export default function PasienPage() {
  return (
    <div className="space-y-6">
    
      <PasienOverview />
    </div>
  );
}
