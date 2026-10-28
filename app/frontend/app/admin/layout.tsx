"use client";

import { Suspense } from "react";
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
        <Suspense
          fallback={
            <aside
              aria-hidden="true"
              className="hidden h-screen w-66 shrink-0 border-r border-tiby-teal-100 bg-white md:block"
            />
          }
        >
          <UniversalSidebar
            user={user}
            brandName="Tiby Admin"
            brandSubtitle="Kontrol Nasional"
            brandInitial="A"
            roleTitle="Administrator Pusat"
            items={adminMenuItems}
          />
        </Suspense>
        <main className="flex flex-1 flex-col overflow-y-auto p-6 md:p-8">
          <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col">
            <div className="shrink-0">
              <Suspense
                fallback={
                  <div
                    aria-hidden="true"
                    className="mb-6 h-4 border-b border-gray-200 pb-4"
                  />
                }
              >
                <PageHeader />
              </Suspense>
            </div>
            <div className="flex-1">{children}</div>
            <Footer />
          </div>
        </main>
      </div>
    </RoleGuard>
  );
}
