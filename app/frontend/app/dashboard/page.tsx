"use client";

import { useSession, type TibyUser } from "@/lib/auth-client";
import { roleHome } from "@/lib/roles";
import { useRouter } from "next/navigation";
import { useEffect } from "react";


export default function DashboardRedirect() {
  const { data, isPending } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (isPending) return;
    if (!data?.user) {
      router.push("/login");
      return;
    }
    router.replace(roleHome((data.user as TibyUser).role));
  }, [data, isPending, router]);

  return <div className="flex min-h-screen items-center justify-center text-tiby-muted">Mengarahkan...</div>;
}
