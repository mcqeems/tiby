"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { revealItem, staggerParent } from "@/lib/motion";
import { EASE } from "./shared";

export default function Hero() {
  return (
    <header className="relative flex min-h-screen items-center overflow-hidden bg-white pt-24">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 px-6 pb-16 lg:grid-cols-2 lg:gap-4">
        <motion.div
          variants={staggerParent(0.12, 0.1)}
          initial="hidden"
          animate="visible"
          className="relative z-10 flex flex-col items-start"
        >
          <motion.h1
            variants={revealItem}
            className="font-heading text-6xl font-bold leading-[1.02] tracking-tight text-gray-900 lg:text-[5.5rem]"
          >
            Lapor Suara,
            <br />
            <span className="text-tiby-teal-500">Tetap Tenang.</span>
          </motion.h1>

          <motion.p
            variants={revealItem}
            className="mt-6 max-w-md text-[15px] leading-relaxed text-gray-500"
          >
            Catat keluhan dan obat harianmu hanya dengan bicara. Pandu siap
            mendengarkan tanpa menghakimi.
          </motion.p>

          <motion.div variants={revealItem} className="mt-8 w-full max-w-md">
            <div className="flex items-center rounded-2xl bg-gray-100 px-5 py-4">
              <span className="shrink-0 text-sm font-semibold text-gray-900">
                tiby.id/
              </span>
              <span className="truncate text-sm text-gray-400">
                username-kamu
              </span>
            </div>
            <Link
              href="/login"
              className="mt-4 inline-flex items-center justify-center rounded-2xl bg-tiby-teal-100 px-6 py-3.5 text-sm font-bold text-tiby-teal-700 transition-all hover:-translate-y-0.5 hover:bg-tiby-teal-200 hover:shadow-lg"
            >
              Masuk ke Tiby
            </Link>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 40, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 1, delay: 0.25, ease: EASE }}
          className="relative flex h-full w-full items-center justify-center lg:justify-end"
        >
          <Image
            src="/holding.jpg"
            alt="Ilustrasi Aplikasi Tiby"
            width={896}
            height={1200}
            sizes="(min-width: 1024px) 50vw, 100vw"
            preload
            loading="eager"
            className="h-auto w-full object-contain"
          />
        </motion.div>
      </div>
    </header>
  );
}
