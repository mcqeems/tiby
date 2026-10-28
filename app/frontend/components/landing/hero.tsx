"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import MascotAnimation from "@/components/mascot-animation";
import { EASE } from "./shared";
import { ArrowBigRight } from "lucide-react";

export default function Hero() {
  return (
    <header className="relative flex min-h-screen items-center overflow-hidden bg-white">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 px-6 pb-16 pt-16 lg:grid-cols-2 lg:gap-8 lg:pt-20">
        <div className="relative z-10 flex flex-col items-start pt-10 lg:pt-0">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: EASE }}
            className="font-heading text-5xl font-extrabold leading-[1.05] tracking-tight text-gray-900 sm:text-6xl lg:text-[5.5rem]"
          >
            Lapor Suara,
            <br />
            <span className="text-tiby-teal-600 lg:text-[4.5rem]">
              Tetap Tenang.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: EASE }}
            className="mt-6 max-w-md text-lg leading-relaxed text-gray-500"
          >
            Catat keluhan dan obat harianmu hanya dengan bicara. Pandu siap
            mendengarkan tanpa menghakimi.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: EASE }}
            className="mt-10 w-full max-w-md"
          >
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-3xl bg-tiby-teal-700 px-6 py-4 text-sm font-bold text-tiby-teal-100 transition-all hover:-translate-y-0.5 hover:bg-tiby-teal-300"
              >
                Masuk ke Tiby
                <ArrowBigRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 40, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 1, delay: 0.3, ease: EASE }}
          className="relative flex h-full w-full items-center justify-center lg:justify-end"
        >
          <Image
            src="/holding.jpg"
            alt="Ilustrasi Aplikasi Tiby"
            width={800}
            height={800}
            priority
            className="h-auto w-full object-contain"
            style={{
              maskImage:
                "linear-gradient(to right, black 85%, transparent 100%), linear-gradient(to bottom, black 85%, transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(to right, black 85%, transparent 100%), linear-gradient(to bottom, black 85%, transparent 100%)",
              maskComposite: "intersect",
              WebkitMaskComposite: "source-in",
            }}
          />

          <div className="absolute -left-2 bottom-6 hidden h-32 w-32 lg:block xl:h-40 xl:w-40">
            <MascotAnimation
              emotion="wave"
              fill
              altText="Pandu melambai"
              priority
              className="drop-shadow-xl"
            />
          </div>
        </motion.div>
      </div>
    </header>
  );
}
