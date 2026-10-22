"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { RoleGuard } from "@/app/role-guard";
import type { TibyUser } from "@/lib/auth-client";
import UniversalSidebar from "@/components/layout/universal-sidebar";
import PageHeader from "@/components/layout/page-header";
import PublicLoading from "@/components/ui/public-loading";
import { consentApi } from "@/lib/api/consent"; 
import { pmoMenuItems } from "./components/pmo-menu";

export default function PmoLayout({ children }: { children: React.ReactNode }) {
  const { data: sessionData, isPending } = useSession();
  const user = sessionData?.user as TibyUser | undefined;

  const router = useRouter();
  const pathname = usePathname();
  const [isCheckingConsent, setIsCheckingConsent] = useState(true);

  useEffect(() => {
    if (isPending) return;

    async function checkConsent() {
      if (pathname === "/pmo/consent") {
        setIsCheckingConsent(false);
        return;
      }

      try {
        const res = await consentApi.getStatus();
        if (res.mustConfirmConsent || !res.active) {
          router.replace("/pmo/consent");
        } else {
          setIsCheckingConsent(false); 
        }
      } catch (err) {
        console.error("Gagal cek consent PMO:", err);
        setIsCheckingConsent(false); 
      }
    }

    checkConsent();
  }, [pathname, router, isPending]);

  return (
    <RoleGuard allowed={["PMO"]}>
      <div className="flex min-h-screen bg-tiby-white text-tiby-ink font-body selection:bg-tiby-teal-100 selection:text-tiby-teal-700">
        <UniversalSidebar
          user={user}
          brandName="Tiby PMO"
          brandSubtitle="Pengawasan Terapi"
          brandInitial="T"
          roleTitle="Pengawas Menelan Obat"
          items={pmoMenuItems}
        />
        <main className="flex-1 overflow-y-auto p-6 md:p-8 pb-24 md:pb-8">
          <PageHeader />

          {isCheckingConsent ? (
            <PublicLoading fullScreen message="Memeriksa izin akses PMO..." />
          ) : (
            children
          )}
        </main>
      </div>
    </RoleGuard>
  );
}
