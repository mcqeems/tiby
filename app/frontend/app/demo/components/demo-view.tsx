"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Info,
  Loader2,
  Play,
  Timer,
  User,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { Reveal } from "@/components/landing/shared";
import { staggerParent, revealItem } from "@/lib/motion";
import LogoAnimate from "@/components/logo-animate";
import { ModalFrame, ModalCard } from "@/components/ui/modal-frame";
import { demoApi } from "@/lib/api/demo";
import { formatRemaining } from "@/lib/demo";
import { roleHome } from "@/lib/roles";
import type { DemoRole, DemoStatus } from "@/lib/types/demo";

const ROLES: Array<{
  role: DemoRole;
  icon: typeof User;
  label: string;
  name: string;
}> = [
  {
    role: "PASIEN",
    icon: User,
    label: "Pasien",
    name: "Budi Santoso",
  },
  {
    role: "PMO",
    icon: UserCheck,
    label: "PMO",
    name: "Ratna Dewi",
  },
  {
    role: "NAKES",
    icon: Users,
    label: "Nakes",
    name: "dr. Rini Suryani",
  },
];

const RULES = [
  "Sesi berlaku 2 jam sejak dimulai dan tidak diperpanjang.",
  "Semua akun dan data demo dihapus permanen saat sesi berakhir.",
  "Maksimal 10 sesi aktif bersamaan dan 5 mulai per jam per alamat IP.",
  "Satu sesi berisi 3 peran — Pasien, PMO, dan Nakes — dalam satu fasilitas demo. Kamu bisa berganti peran tanpa login ulang.",
  "Gunakan data dummy. Jangan memasukkan data pribadi asli.",
  "Pasien utama sengaja belum memberi consent dan belum punya check-in, agar alur consent dan check-in bisa dicoba.",
  "Tombol Akhiri Demo menghapus sesi lebih awal.",
];

export default function DemoView() {
  const [status, setStatus] = useState<DemoStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [entering, setEntering] = useState<DemoRole | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [rulesOpen, setRulesOpen] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    try {
      setStatus(await demoApi.status());
    } catch {
      // Keep the last known state; a transient failure should not blank the page.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Deferred first fetch keeps react-hooks/set-state-in-effect happy, and
    // deferring the clock keeps `new Date()` out of the prerender path.
    const first = window.setTimeout(() => {
      void refresh();
      setNow(new Date());
    }, 0);
    const poll = window.setInterval(() => void refresh(), 30_000);
    const clock = window.setInterval(() => setNow(new Date()), 30_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(poll);
      window.clearInterval(clock);
    };
  }, [refresh]);

  async function startDemo() {
    setStarting(true);
    setErrorMessage("");
    try {
      await demoApi.start();
      await refresh();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Gagal memulai demo.",
      );
      await refresh();
    } finally {
      setStarting(false);
    }
  }

  async function enterRole(role: DemoRole) {
    setEntering(role);
    try {
      await demoApi.enter(role);
      // The session cookie is minted server-side, so a hard navigation makes
      // useSession fetch fresh instead of trusting the auth-client store.
      window.location.assign(roleHome(role));
    } catch (err) {
      setEntering(null);
      setErrorMessage(err instanceof Error ? err.message : "Gagal masuk.");
    }
  }

  async function endDemo() {
    try {
      await demoApi.end();
    } finally {
      window.location.assign("/");
    }
  }

  const active = status?.active ?? false;
  const activeCount = status?.activeCount ?? 0;
  const maxActive = status?.maxActive ?? 10;
  const isFull = activeCount >= maxActive;
  const remainingSlots = Math.max(maxActive - activeCount, 0);
  const nextExpiry = status?.sessions.length
    ? [...status.sessions].sort(
        (a, b) =>
          new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime(),
      )[0].expiresAt
    : null;
  const waitLabel = nextExpiry && now ? formatRemaining(nextExpiry, now) : null;
  const countdown =
    status?.expiresAt && now ? formatRemaining(status.expiresAt, now) : null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center px-6 py-10">
      <Link
        href="/"
        className="self-start inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Beranda
      </Link>

      <div className="mt-10 flex flex-col items-center text-center">
        <LogoAnimate loop={false} version="stop-middle" size={56} />
        <Reveal>
          <h1 className="font-heading mt-4 text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
            Coba Tiby
          </h1>
        </Reveal>
        <Reveal delay={0.05}>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-gray-500">
            Mulai sesi demo 2 jam, lalu jelajahi Tiby sebagai Pasien, PMO, atau
            Nakes. Semua data dihapus otomatis saat sesi berakhir.
          </p>
        </Reveal>
      </div>

      {loading && !status && (
        <div className="mt-14 flex items-center gap-2.5 text-sm text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin text-tiby-teal-600" />
          Memeriksa sesi demo...
        </div>
      )}

      {!loading && !status && (
        <div className="mt-14 flex max-w-sm flex-col items-center gap-3 text-center">
          <p className="text-sm text-gray-500">Gagal memuat status demo.</p>
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-black"
          >
            Coba lagi
          </button>
        </div>
      )}

      {status && (
        <div className="mt-8 w-full space-y-4">
          <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Sesi demo terpakai
                </p>
                <p className="font-heading mt-1 text-2xl font-bold text-gray-900">
                  {activeCount}/{maxActive}
                </p>
              </div>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                  isFull
                    ? "bg-amber-50 text-amber-700"
                    : "bg-tiby-teal-100 text-tiby-teal-700"
                }`}
              >
                {isFull ? "Penuh" : `${remainingSlots} slot tersisa`}
              </span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full transition-all ${
                  isFull ? "bg-amber-500" : "bg-tiby-teal-500"
                }`}
                style={{
                  width: `${Math.min((activeCount / maxActive) * 100, 100)}%`,
                }}
              />
            </div>

            {active ? (
              <div className="mt-6">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-tiby-teal-100 px-4 py-1.5 text-sm font-semibold text-tiby-teal-700">
                  <Timer className="h-4 w-4" />
                  Sisa {countdown ?? "—"}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-gray-500">
                  Pilih peran untuk masuk. Kamu bisa berganti peran kapan saja
                  tanpa login ulang.
                </p>
                {errorMessage && (
                  <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
                )}
              </div>
            ) : (
              <div className="mt-6">
                <button
                  type="button"
                  disabled={isFull || starting}
                  onClick={startDemo}
                  className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {starting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {starting
                    ? "Menyiapkan demo..."
                    : isFull
                      ? "Sesi penuh"
                      : "Mulai Demo"}
                </button>
                <p className="mt-3 text-sm leading-relaxed text-gray-500">
                  {isFull && waitLabel
                    ? `Semua slot sedang dipakai. Sesi terdekat berakhir dalam ${waitLabel}.`
                    : "Sesi berlaku 2 jam. Semua data demo dihapus otomatis setelahnya."}
                </p>
                {errorMessage && (
                  <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
                )}
              </div>
            )}
          </section>

          {active && (
            <motion.div
              variants={staggerParent(0.06, 0.05)}
              initial="hidden"
              animate="visible"
              className="grid w-full gap-3 md:grid-cols-3"
            >
              {ROLES.map((item) => {
                const Icon = item.icon;
                const busy = entering === item.role;
                return (
                  <motion.button
                    key={item.role}
                    type="button"
                    variants={revealItem}
                    disabled={entering !== null}
                    onClick={() => enterRole(item.role)}
                    className="group flex flex-col items-start gap-1 rounded-3xl border border-gray-100 bg-white p-6 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-tiby-teal-200 hover:shadow-lg disabled:opacity-60"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-tiby-teal-100 text-tiby-teal-700">
                      {busy ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </span>
                    <span className="font-heading mt-3 text-[15px] font-bold text-gray-900">
                      {item.label}
                    </span>
                    <span className="text-sm font-medium text-tiby-teal-700">
                      {item.name}
                    </span>

                    <span className="mt-auto inline-flex items-center gap-1 pt-3 text-sm font-semibold text-gray-900 transition-transform duration-300 group-hover:translate-x-0.5">
                      <Play className="h-3.5 w-3.5" />
                      Masuk
                    </span>
                  </motion.button>
                );
              })}
            </motion.div>
          )}

          <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-heading text-base font-bold text-gray-900">
                Sesi demo aktif
              </h2>
              <span className="text-xs font-medium text-gray-500">
                {activeCount}/{maxActive}
              </span>
            </div>
            {status.sessions.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {status.sessions.map((session) => (
                  <li
                    key={`${session.label}-${session.startedAt}`}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 px-4 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-green-500" />
                      <span className="truncate text-sm font-medium text-gray-700">
                        Sesi #{session.label}
                      </span>
                      {session.isMine && (
                        <span className="shrink-0 rounded-full bg-tiby-teal-100 px-2 py-0.5 text-[11px] font-semibold text-tiby-teal-700">
                          Sesi Anda
                        </span>
                      )}
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-gray-500">
                      <Clock className="h-3.5 w-3.5" />
                      Sisa {now ? formatRemaining(session.expiresAt, now) : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-gray-500">
                Belum ada sesi aktif. Jadilah yang pertama mencoba.
              </p>
            )}
          </section>

          <button
            type="button"
            onClick={() => setRulesOpen(true)}
            className="flex w-full items-center gap-4 rounded-3xl border border-gray-100 bg-white p-5 text-left shadow-sm transition-colors hover:bg-gray-50"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-tiby-teal-100 text-tiby-teal-700">
              <Info className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-gray-900">
                Cara kerja & aturan demo
              </span>
              <span className="mt-0.5 block text-sm text-gray-500">
                Durasi, kuota, batasan, dan apa yang terjadi pada data demo.
              </span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-gray-400" />
          </button>

          {active && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={endDemo}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-400 transition-colors hover:text-gray-600"
              >
                Akhiri Demo
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      <ModalFrame
        open={rulesOpen}
        onClose={() => setRulesOpen(false)}
        label="Aturan mode demo"
      >
        <ModalCard className="w-full max-w-md rounded-3xl bg-white p-7 shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-heading text-lg font-bold text-gray-900">
                Aturan mode demo
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Baca dulu sebelum mulai.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRulesOpen(false)}
              aria-label="Tutup"
              className="rounded-full bg-gray-50 p-2 text-gray-500 transition-colors hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <ul className="mt-5 space-y-3">
            {RULES.map((rule) => (
              <li
                key={rule}
                className="flex gap-2.5 text-sm leading-relaxed text-gray-600"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-tiby-teal-500" />
                {rule}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setRulesOpen(false)}
            className="mt-6 w-full rounded-full bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-black"
          >
            Mengerti
          </button>
        </ModalCard>
      </ModalFrame>
    </main>
  );
}
