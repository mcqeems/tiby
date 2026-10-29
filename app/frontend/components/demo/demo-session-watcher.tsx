"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { useSession, authClient, type TibyUser } from "@/lib/auth-client";
import { demoApi } from "@/lib/api/demo";
import { ModalFrame, ModalCard } from "@/components/ui/modal-frame";

/** Polls the demo session for signed-in demo visitors; gates them to
 * `/demo` the moment the 2h session expires. Silent for everyone else. */
export default function DemoSessionWatcher() {
  const { data } = useSession();
  const pathname = usePathname();
  const user = data?.user as TibyUser | undefined;
  const [expired, setExpired] = useState(false);

  const check = useCallback(async () => {
    try {
      // Revalidate so a stale cookie from a deleted demo user does not mask
      // expiry: useSession's cached store would otherwise keep returning data.
      const session = await authClient.getSession({
        query: { disableCookieCache: true },
      });
      const fresh = session?.data?.user as TibyUser | undefined;
      if (!fresh) return;
      const status = await demoApi.status();
      if (!status.active) setExpired(true);
    } catch {
      // Offline or transient failure: stay in the app, no-op (ponytail).
    }
  }, []);

  useEffect(() => {
    if (!user?.demo_session_id || pathname.startsWith("/demo")) return;
    // Defer the first check so the initial render does not trigger a
    // synchronous setState cascade (react-hooks/set-state-in-effect).
    const tick = () => {
      void check();
    };
    const starter = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 30_000);
    window.addEventListener("focus", tick);
    return () => {
      window.clearTimeout(starter);
      window.clearInterval(id);
      window.removeEventListener("focus", tick);
    };
  }, [user?.demo_session_id, pathname, check]);

  return (
    <ModalFrame
      open={expired}
      label="Sesi demo berakhir"
      closeOnEscape={false}
      dismissOnBackdrop={false}
    >
      <ModalCard className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-tiby-teal-100 text-tiby-teal-700">
          <LogOut className="h-6 w-6" />
        </div>
        <h2 className="font-heading mt-4 text-lg font-bold text-gray-900">
          Sesi demo berakhir
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">
          Batas 2 jam sudah habis dan data demo telah dihapus. Mulai demo baru
          untuk melanjutkan.
        </p>
        <button
          type="button"
          onClick={() => {
            // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- needs a fresh useSession, not router cache
            window.location.assign("/demo");
          }}
          className="mt-6 w-full rounded-full bg-gray-900 px-5 py-3 text-sm font-semibold text-white dark:text-black transition-colors hover:bg-black"
        >
          Mulai demo baru
        </button>
      </ModalCard>
    </ModalFrame>
  );
}
