"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Mascot from "@/components/mascot";
import { Reveal } from "./shared";

export default function CTA() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <Reveal>
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-tiby-teal-600 to-tiby-teal-700 px-8 py-16 text-center text-white md:px-16 md:py-20">
          <motion.div
            aria-hidden
            className="absolute -left-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl"
            animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            aria-hidden
            className="absolute -bottom-24 right-10 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl"
            animate={{ x: [0, -30, 0], y: [0, -20, 0] }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          />

          <h2 className="relative font-heading text-3xl font-bold leading-tight tracking-tight md:text-5xl">
            Kalau kamu scroll sejauh ini,
            <br />
            Saatnya <span className="text-emerald-200">Sembuh Bersama.</span>
          </h2>
          <Link
            href="/login"
            className="group relative mt-9 inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-bold text-tiby-teal-700 shadow-lg shadow-black/10 transition-all hover:-translate-y-1 hover:shadow-2xl"
          >
            Masuk ke Tiby
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>

          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-2 right-6 hidden h-36 w-36 md:block"
          >
            <Mascot
              emotion="happy"
              fill
              className="drop-shadow-xl"
            />
          </motion.div>
        </div>
      </Reveal>
    </section>
  );
}
