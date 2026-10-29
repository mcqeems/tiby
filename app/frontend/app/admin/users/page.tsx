import UserManager from "./components/user-manager";
import type { Metadata } from "next";

/** Auth-gated tree (RoleGuard returns null without a session), so the
    segment cannot be validated for instant navigation. Documented opt-out:
    https://nextjs.org/docs/messages/instant-unrendered-segment */
export const instant = false;

export const metadata: Metadata = {
  title: "Manajemen Akun",
  description: "Kelola akun Tenaga Kesehatan (Nakes) tiap Faskes.",
  robots: "noindex, nofollow",
};

export default function AdminUsersPage() {
  return <UserManager />;
}
