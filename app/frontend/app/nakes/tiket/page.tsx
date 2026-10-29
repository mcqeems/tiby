import TicketList from "./components/ticket-list";
import type { Metadata } from "next";

/** Auth-gated tree (RoleGuard returns null without a session), so the
    segment cannot be validated for instant navigation. Documented opt-out:
    https://nextjs.org/docs/messages/instant-unrendered-segment */
export const instant = false;

export const metadata: Metadata = {
  title: "Tiket Tindak Lanjut",
  description:
    "Kelola tiket eskalasi pasien berisiko dan catat tindak lanjut medis.",
  robots: "noindex, nofollow",
};

export default function NakesTiketPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-tiby-ink">
          Tiket Tindak Lanjut
        </h1>
        <p className="text-sm text-tiby-muted">
          Pantau dan selesaikan eskalasi pasien yang membutuhkan perhatian
          medis.
        </p>
      </div>
      <TicketList />
    </div>
  );
}
