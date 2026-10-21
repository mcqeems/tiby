"use client";

import { useSession } from "@/lib/auth-client";
import { RoleGuard } from "@/app/role-guard";
import type { TibyUser } from "@/lib/auth-client";
import NakesSidebar from "./components/nakes-sidebar";

export default function NakesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: sessionData } = useSession();
  const user = sessionData?.user as TibyUser | undefined;

  return (
    <RoleGuard allowed={["NAKES"]}>
      <div className="flex min-h-screen bg-tiby-white text-tiby-ink font-body selection:bg-tiby-teal-100 selection:text-tiby-teal-700">
        <NakesSidebar user={user} roleTitle="Tenaga Kesehatan" />
        <main className="flex-1 overflow-y-auto p-6 md:p-8 pb-24 md:pb-8">
          {children}
        </main>
      </div>
    </RoleGuard>
  );
}
