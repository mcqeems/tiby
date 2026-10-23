"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import type { TibyUser } from "@/lib/auth-client";
import { RoleGuard } from "@/app/role-guard";
import UniversalSidebar from "@/components/layout/universal-sidebar";
import PageHeader from "@/components/layout/page-header";
import PublicLoading from "@/components/ui/public-loading";
import { consentApi } from "@/lib/api/consent";
import { pasienMenuItems } from "./components/pasien-menu";
import Footer from "@/components/layout/footer";

export default function PasienLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: sessionData, isPending } = useSession();
  const user = sessionData?.user as TibyUser | undefined;

  const router = useRouter();
  const pathname = usePathname();
  const [isCheckingConsent, setIsCheckingConsent] = useState(true);

  useEffect(() => {
    if (isPending) return;

    async function checkConsent() {
      if (pathname === "/pasien/consent") {
        setIsCheckingConsent(false);
        return;
      }

      try {
        const res = await consentApi.getStatus();
        if (res.mustConfirmConsent || !res.active) {
          router.replace("/pasien/consent");
        } else {
          setIsCheckingConsent(false);
        }
      } catch (err) {
        console.error("Gagal cek consent:", err);
        setIsCheckingConsent(false);
      }
    }

    checkConsent();
  }, [pathname, router, isPending]);

  return (
    <RoleGuard allowed={["PATIENT", "PASIEN"]}>
      <div className="flex h-screen bg-tiby-white text-tiby-ink font-body selection:bg-tiby-teal-100 selection:text-tiby-teal-700">
        <UniversalSidebar
          user={user}
          brandName="Tiby Pasien"
          brandSubtitle="Kesehatan Mandiri"
          brandInitial="P"
          roleTitle="Pasien Terdaftar"
          items={pasienMenuItems}
        />

        <main className="flex-1 flex flex-col overflow-y-auto p-6 md:p-8">
          <div className="shrink-0">
            <PageHeader />
          </div>

          <div className="flex-1">
            {isCheckingConsent ? (
              <PublicLoading fullScreen message="Memeriksa izin akses..." />
            ) : (
              children
            )}
          </div>

          <Footer />
        </main>
      </div>
    </RoleGuard>
  );
}
