import NotificationComposer from "./components/notification-composer";
import type { Metadata } from "next";

/** Auth-gated tree (RoleGuard returns null without a session), so the
    segment cannot be validated for instant navigation. Documented opt-out:
    https://nextjs.org/docs/messages/instant-unrendered-segment */
export const instant = false;

export const metadata: Metadata = {
  title: "Simulasi Notifikasi",
  description:
    "Kirim notifikasi simulasi lewat push, WhatsApp, atau alert aplikasi.",
  robots: "noindex, nofollow",
};

export default function AdminNotificationsPage() {
  return <NotificationComposer />;
}
