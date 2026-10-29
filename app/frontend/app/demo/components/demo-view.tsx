"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Play,
  Timer,
  User,
  UserCheck,
  Users,
} from "lucide-react";
import { Reveal } from "@/components/landing/shared";
import { VIEWPORT, staggerParent, revealItem } from "@/lib/motion";
import LogoAnimate from "@/components/logo-animate";
import { demoApi } from "@/lib/api/demo";
import { formatRemaining } from "@/lib/demo";
import { roleHome } from "@/lib/roles";
import type { DemoRole } from "@/lib/types/demo";

const ROLES: Array<{
  role: DemoRole;
  icon: typeof User;
  label: string;
  name: string;
  blurb: string;
}> = [
  {
    role: "PASIEN",
    icon: User,
    label: "Pasien",
    name: "Budi Santoso",
    blurb: "Rasakan alur check-in harian dan pendampingan pengobatan.",
  },
  {
    role: "PMO",
    icon: UserCheck,
    label: "PMO",
    name: "Ratna Dewi",
    blurb: "Pantau kepatuhan pasien dari sisi pendamping.",
  },
  {
    role: "NAKES",
    icon: Users,
    label: "Nakes",
    name: "dr. Rini Suryani",
    blurb: "Lihat dasbor faskes dan tindak lanjuti pasien.",
  },
];

export default function DemoView() {
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [entering, setEntering] = useState<DemoRole | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function boot() {
      try {
        const status = await demoApi.status();
        if (status.active && status.expiresAt) {
          setExpiresAt(status.expiresAt);
        } else {
          const started = await demoApi.start();
          setExpiresAt(started.expiresAt);
        }
        setPhase("ready");
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : "Gagal memulai demo.",
        );
        setPhase("error");
      }
    }
    void boot();
  }, []);

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
      setPhase("error");
    }
  }

  async function endDemo() {
    try {
      await demoApi.end();
    } finally {
      window.location.assign("/");
    }
  }

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
            Pilih peran untuk masuk ke demo. Sesi berlaku 2 jam dan seluruh
            data demo dihapus otomatis setelahnya.
          </p>
        </Reveal>
      </div>

      {phase === "loading" && (
        <div className="mt-14 flex items-center gap-2.5 text-sm text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin text-tiby-teal-600" />
          Menyiapkan demo...
        </div>
      )}

      {phase === "error" && (
        <div className="mt-14 flex max-w-sm flex-col items-center gap-3 text-center">
          <p className="text-sm text-gray-500">{errorMessage}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-black"
          >
            Coba lagi
          </button>
        </div>
      )}

      {phase === "ready" && (
        <>
          {expiresAt && (
            <div className="mt-8 inline-flex items-center gap-1.5 rounded-full bg-tiby-teal-100 px-4 py-1.5 text-sm font-semibold text-tiby-teal-700">
              <Timer className="h-4 w-4" />
              Sisa {formatRemaining(expiresAt)}
            </div>
          )}
          <motion.div
            variants={staggerParent(0.06, 0.05)}
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT}
            className="mt-6 grid w-full gap-3 md:grid-cols-3"
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
                  <span className="mt-1 text-sm leading-relaxed text-gray-500">
                    {item.blurb}
                  </span>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-gray-900 transition-transform duration-300 group-hover:translate-x-0.5">
                    <Play className="h-3.5 w-3.5" />
                    Masuk
                  </span>
                </motion.button>
              );
            })}
          </motion.div>
          <button
            type="button"
            onClick={endDemo}
            className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-gray-400 transition-colors hover:text-gray-600"
          >
            Akhiri Demo
            <ArrowRight className="h-4 w-4" />
          </button>
        </>
      )}
    </main>
  );
}
