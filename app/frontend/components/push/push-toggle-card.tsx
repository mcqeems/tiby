"use client";

import { useCallback, useEffect, useState } from "react";
import { pushApi } from "@/lib/api/push";
import { urlBase64ToUint8Array } from "@/lib/push-utils";
import { Bell, BellOff, Loader2, ShieldCheck } from "lucide-react";

type PushState =
  | "loading"
  | "unsupported"
  | "denied"
  | "off"
  | "on"
  | "working"
  | "error";

export default function PushToggleCard() {
  const [state, setState] = useState<PushState>("loading");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      typeof Notification === "undefined" ||
      !window.isSecureContext
    ) {
      setState("unsupported");
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        setState("on");
      } else {
        setState(Notification.permission === "denied" ? "denied" : "off");
      }
    } catch {
      setState("error");
      setError("Tidak dapat memeriksa status notifikasi.");
    }
  }, []);

  useEffect(() => {
    // Defer the permission/subscription lookup so the first render stays pure.
    const timer = setTimeout(() => {
      refresh();
    }, 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  const enable = async () => {
    setState("working");
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("denied");
        return;
      }

      const { publicKey } = await pushApi.getVapidPublicKey();
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });

      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error("Langganan notifikasi tidak lengkap.");
      }

      await pushApi.subscribe({
        endpoint: json.endpoint,
        expirationTime: json.expirationTime ?? null,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      });
      setState("on");
    } catch (err: unknown) {
      setState("error");
      setError(
        err instanceof Error
          ? err.message
          : "Gagal mengaktifkan notifikasi di perangkat ini.",
      );
    }
  };

  const disable = async () => {
    setState("working");
    setError(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await pushApi.unsubscribe(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setState("off");
    } catch (err: unknown) {
      setState("error");
      setError(
        err instanceof Error ? err.message : "Gagal menonaktifkan notifikasi.",
      );
    }
  };

  const busy = state === "loading" || state === "working";

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
      <header className="flex items-center gap-3 border-b border-gray-100 bg-linear-to-r from-tiby-teal-50/70 to-white px-6 py-4 sm:px-8">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-tiby-teal-700 shadow-sm ring-1 ring-tiby-teal-100">
          <Bell className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0">
          <h3 className="font-heading text-base font-semibold leading-tight text-tiby-ink">
            Notifikasi Push
          </h3>
          <p className="mt-0.5 text-xs text-tiby-muted">
            Terima pengingat minum obat dan pemberitahuan penting di perangkat
            ini.
          </p>
        </div>
      </header>

      <div className="space-y-3 p-6 sm:p-8">
        {state === "unsupported" ? (
          <p className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[11px] text-tiby-muted">
            Browser ini belum mendukung notifikasi push. Gunakan Chrome/Edge
            terbaru, atau pasang aplikasi ke layar utama di iPhone.
          </p>
        ) : state === "denied" ? (
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
            <BellOff className="h-4 w-4 shrink-0" />
            Izin notifikasi diblokir. Aktifkan lewat pengaturan situs di browser.
          </div>
        ) : state === "on" ? (
          <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-emerald-600 ring-1 ring-emerald-200">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-emerald-900">
                  Notifikasi aktif
                </p>
                <p className="text-xs text-emerald-700">
                  Perangkat ini akan menerima pengingat dari Pandu.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={disable}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-4 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              Nonaktifkan
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={enable}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-tiby-teal-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-tiby-teal-700 disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Bell className="h-4 w-4" />
            )}
            {busy ? "Memproses…" : "Aktifkan notifikasi"}
          </button>
        )}

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
