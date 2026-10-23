"use client";

import { useSession, type TibyUser } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const ROLE_PATH: Record<string, string> = {
  ADMIN: "/admin",
  NAKES: "/nakes",
  PMO: "/pmo",
  PASIEN: "/pasien",
};

export default function DashboardRedirect() {
  const { data, isPending } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (isPending) return;
    if (!data?.user) {
      router.push("/login");
      return;
    }
    const role = ((data.user as TibyUser).role || "PASIEN").toUpperCase();
    router.replace(ROLE_PATH[role] ?? "/pasien");
  }, [data, isPending, router]);

  return <div className="flex min-h-screen items-center justify-center text-tiby-muted">Mengarahkan...</div>;
}
