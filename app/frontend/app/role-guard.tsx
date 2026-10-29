"use client";

import { useSession, signOut, type TibyUser } from "@/lib/auth-client";
import { setAvatar } from "@/lib/avatar";
import { roleHome } from "@/lib/roles";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export async function handleSignOut(redirectTo = "/login") {
  setAvatar(undefined);
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
      router.push(roleHome(role, "/login"));
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
