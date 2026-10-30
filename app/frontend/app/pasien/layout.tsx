"use client";

import { useEffect, useState } from "react";
import { ROLE_TITLES } from "@/lib/roles";
import { useSession } from "@/lib/auth-client";
import type { TibyUser } from "@/lib/auth-client";
import { RoleGuard } from "@/app/role-guard";
import UniversalSidebar from "@/components/layout/universal-sidebar";
import PageHeader from "@/components/layout/page-header";
import PublicLoading from "@/components/ui/public-loading";
import { consentApi } from "@/lib/api/consent";
import { pasienMenuItems } from "./components/pasien-menu";
import Footer from "@/components/layout/footer";
import ConsentModal from "@/components/consent/consent-modal";
import UserNotificationBell from "@/components/notifications/user-notification-bell";

export default function PasienLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: sessionData, isPending } = useSession();
  const user = sessionData?.user as TibyUser | undefined;

  const [consentGranted, setConsentGranted] = useState<boolean | null>(null);

  useEffect(() => {
    // Only the owning role may call /api/consent; prefetches of another role's
    // layout must not produce 403 noise.
    if (isPending || !user || user.role !== "PASIEN") return;

    async function checkConsent() {
      try {
        const res = await consentApi.getStatus();
        setConsentGranted(Boolean(res.active) && !res.mustConfirmConsent);
      } catch (err) {
        console.error("Gagal cek consent:", err);
        setConsentGranted(false);
      }
    }

    checkConsent();
  }, [isPending, user]);

  return (
    <RoleGuard allowed={["PATIENT", "PASIEN"]}>
      <div className="flex h-screen bg-tiby-white text-tiby-ink font-body selection:bg-tiby-teal-100 selection:text-tiby-teal-700">
        <UniversalSidebar
          user={user}
          brandName="Tiby Pasien"
          brandSubtitle="Kesehatan Mandiri"
          brandInitial="P"
          roleTitle={ROLE_TITLES.PASIEN}
          items={pasienMenuItems}
        />

        <main className="flex min-w-0 flex-1 flex-col overflow-y-auto p-6 md:p-8">
          <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col">
            <div className="absolute right-0 top-0 z-30">
              <UserNotificationBell />
            </div>
            <div className="shrink-0 pr-14">
              <PageHeader />
            </div>

            <div className="flex-1">
              {consentGranted === null ? (
                <PublicLoading fullScreen message="Memeriksa izin akses..." />
              ) : (
                <div
                  key={consentGranted ? "granted" : "pending"}
                  className={`h-full ${
                    consentGranted ? "" : "pointer-events-none select-none"
                  }`}
                  aria-hidden={!consentGranted}
                >
                  {children}
                </div>
              )}
            </div>
            <Footer />
          </div>
        </main>
      </div>

      {consentGranted === false && (
        <ConsentModal role="PASIEN" onGranted={() => setConsentGranted(true)} />
      )}
    </RoleGuard>
  );
}
