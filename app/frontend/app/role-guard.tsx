"use client";

import { useSession, signOut, ROLE_PATHS, type TibyUser } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export async function handleSignOut(redirectTo = "/login") {
  await signOut();
  window.location.href = redirectTo;
}

export function RoleGuard({
  allowed,
  children,
}: {
  allowed: string[];
  children: React.ReactNode;
}) {
  const { data, isPending } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (isPending) return;

    if (!data?.user) {
      router.push("/login");
      return;
    }

    const user = data.user as TibyUser;
    const role = (user.role || "PASIEN").toUpperCase();

    if (!allowed.includes(role)) {
      router.push(ROLE_PATHS[role] ?? "/login");
    }
  }, [data, isPending, router, allowed]);

  if (isPending) {
    return <>{children}</>;
  }

  if (!data?.user) return null;

  const user = data.user as TibyUser;
  const role = (user.role || "PASIEN").toUpperCase();

  if (!allowed.includes(role)) return null;

  return <>{children}</>;
}
