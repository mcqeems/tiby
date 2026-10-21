"use client";

import { useSession } from "@/lib/auth-client";
import { RoleGuard } from "@/app/role-guard";
import type { TibyUser } from "@/lib/auth-client";
import UniversalSidebar from "@/components/layout/universal-sidebar";
import PageHeader from "@/components/layout/page-header";
import { pasienMenuItems } from "./components/pasien-menu";

export default function PasienLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: sessionData } = useSession();
  const user = sessionData?.user as TibyUser | undefined;

  return (
    <RoleGuard allowed={["PATIENT", "PASIEN"]}>
      <div className="flex min-h-screen bg-tiby-white text-tiby-ink font-body selection:bg-tiby-teal-100 selection:text-tiby-teal-700">
        <UniversalSidebar
          user={user}
          brandName="Tiby Pasien"
          brandSubtitle="Kesehatan Mandiri"
          brandInitial="P"
          roleTitle="Pasien Terdaftar"
          items={pasienMenuItems}
        />
        <main className="flex-1 overflow-y-auto p-6 md:p-8 pb-24 md:pb-8">
          <PageHeader />
          {children}
        </main>
      </div>
    </RoleGuard>
  );
}
