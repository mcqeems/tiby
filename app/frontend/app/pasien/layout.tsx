"use client";

import { RoleGuard } from "../role-guard";

export default function PasienLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleGuard allowed={["PASIEN"]}>{children}</RoleGuard>;
}
