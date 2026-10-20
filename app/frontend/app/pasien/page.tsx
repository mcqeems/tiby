"use client";

import { useSession } from "@/lib/auth-client";
import { handleSignOut } from "../role-guard";
import type { TibyUser } from "@/lib/auth-client";

export default function PasienPage() {
  const { data, isPending } = useSession();

  if (isPending) return <div className="flex min-h-screen items-center justify-center text-tiby-muted">Loading...</div>;

  const user = data?.user as TibyUser | undefined;

  return (
    <div className="min-h-screen bg-tiby-white p-4">
      <div className="mx-auto max-w-sm">
        <div className="rounded-card bg-tiby-teal-50 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
          <h1 className="font-heading text-2xl font-600 text-tiby-ink">Beranda Pasien</h1>
          <p className="mt-1 text-sm text-tiby-muted font-body">
            Halo, {user?.name || user?.username}
          </p>
          <p className="mt-1 text-xs text-tiby-muted font-body">Role: {user?.role}</p>
          <button
            onClick={() => handleSignOut()}
            className="mt-4 rounded-full border border-tiby-teal-600 px-5 py-2 text-sm font-medium text-tiby-teal-700 font-body"
          >
            Keluar
          </button>
        </div>
      </div>
    </div>
  );
}
