import UserManager from "./components/user-manager";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manajemen Akun",
  description: "Kelola akun Tenaga Kesehatan (Nakes) tiap Faskes.",
  robots: "noindex, nofollow",
};

export default function AdminUsersPage() {
  return <UserManager />;
}
