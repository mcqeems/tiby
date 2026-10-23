"use client";

import { useSession } from "@/lib/auth-client";
import { RoleGuard } from "@/app/role-guard";
import type { TibyUser } from "@/lib/auth-client";
import UniversalSidebar from "@/components/layout/universal-sidebar";
import PageHeader from "@/components/layout/page-header";
import { adminMenuItems } from "./components/admin-menu";
import Footer from "@/components/layout/footer";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: sessionData } = useSession();
  const user = sessionData?.user as TibyUser | undefined;

  return (
    <RoleGuard allowed={["ADMIN"]}>
      <div className="flex h-screen bg-tiby-white text-tiby-ink font-body selection:bg-tiby-teal-100 selection:text-tiby-teal-700">
        <UniversalSidebar
          user={user}
          brandName="Tiby Admin"
          brandSubtitle="Kontrol Nasional"
          brandInitial="A"
          roleTitle="Administrator Pusat"
          items={adminMenuItems}
        />
        <main className="flex flex-1 flex-col overflow-y-auto p-6 md:p-8 pb-24 md:pb-8">
          <div className="shrink-0 mb-6">
            <PageHeader />
          </div>
          <div className="flex-1">{children}</div>
          <Footer />
        </main>
      </div>
    </RoleGuard>
  );
}
