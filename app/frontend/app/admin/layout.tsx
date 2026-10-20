"use client";

import { RoleGuard } from "../role-guard";

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleGuard allowed={["ADMIN"]}>{children}</RoleGuard>;
}
