"use client";

import { useSession } from "@/lib/auth-client";
import { RoleGuard } from "@/app/role-guard";
import type { TibyUser } from "@/lib/auth-client";
import UniversalSidebar from "@/components/layout/universal-sidebar";
import PageHeader from "@/components/layout/page-header";
import { nakesMenuItems } from "./components/nakes-menu";
import NakesNotificationBell from "./components/nakes-notification-bell";
import Footer from "@/components/layout/footer";

export default function NakesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: sessionData } = useSession();
  const user = sessionData?.user as TibyUser | undefined;

  return (
    <RoleGuard allowed={["NAKES"]}>
      <div className="flex h-screen bg-tiby-white text-tiby-ink font-body selection:bg-tiby-teal-100 selection:text-tiby-teal-700">
        <UniversalSidebar
          user={user}
          brandName="Tiby Nakes"
          brandSubtitle="Dashboard Klinis"
          brandInitial="T"
          roleTitle="Tenaga Kesehatan"
          items={nakesMenuItems}
        />

        <main className="relative flex flex-1 flex-col overflow-y-auto p-6 md:p-8 pb-24 md:pb-8">
          <div className="absolute top-6 right-6 md:top-8 md:right-8 z-10">
            <NakesNotificationBell />
          </div>

          <div className="shrink-0 pr-14">
            <PageHeader />
          </div>

          <div className="flex-1">{children}</div>

          <Footer />
        </main>
      </div>
    </RoleGuard>
  );
}
