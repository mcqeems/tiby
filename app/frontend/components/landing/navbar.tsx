"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowUpRight, Play } from "lucide-react";
import LogoAnimate from "@/components/logo-animate";
import { demoApi } from "@/lib/api/demo";

export default function Navbar() {
  const [demoActive, setDemoActive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void demoApi
      .status()
      .then((status) => {
        if (!cancelled) setDemoActive(status.active);
      })
      .catch(() => {
        // The landing page stays usable if the API is unreachable.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 top-0 z-50 bg-white/80 backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        <Link href="/" className="flex items-center" aria-label="Tiby home">
          <LogoAnimate loop={false} version="stop-middle" size={48} />
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/demo"
            aria-label={demoActive ? "Mode Demo, sesi aktif" : "Mode Demo"}
            title={demoActive ? "Sesi demo aktif" : undefined}
            className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200 sm:px-5"
          >
            {demoActive ? (
              <span aria-hidden="true" className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
              </span>
            ) : (
              <Play className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Mode Demo</span>
          </Link>

          <Link
            href="/login"
            className="group flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-tiby-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-tiby-teal-700"
          >
            Buka App
            <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}
