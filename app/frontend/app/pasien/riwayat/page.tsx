import RiwayatView from "./components/riwayat-view";
import type { Metadata } from "next";

/** Auth-gated tree (RoleGuard returns null without a session), so the
    segment cannot be validated for instant navigation. Documented opt-out:
    https://nextjs.org/docs/messages/instant-unrendered-segment */
export const instant = false;

export const metadata: Metadata = {
  title: "Riwayat Check-In",
  description:
    "Lihat kalender kepatuhan dan riwayat laporan harian pengobatan Anda.",
  robots: "noindex, nofollow",
};

export default function RiwayatTerapiPage() {
  return <RiwayatView />;
}
