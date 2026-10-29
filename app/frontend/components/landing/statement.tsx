"use client";

import { motion } from "motion/react";
import { Mic, ShieldCheck, BadgeCheck, type LucideIcon } from "lucide-react";
import { Reveal } from "./shared";
import { VIEWPORT, staggerParent, revealItem } from "@/lib/motion";

const PILLS: { icon: LucideIcon; label: string; bg: string }[] = [
  { icon: Mic, label: "Responsif", bg: "bg-blue-50 text-blue-500" },
  { icon: ShieldCheck, label: "Privasi", bg: "bg-tiby-teal-50 text-tiby-teal-600" },
  { icon: BadgeCheck, label: "Valid", bg: "bg-red-50 text-red-500" },
];

export default function Statement() {
  return (
    <section className="mx-auto w-full h-screen flex flex-col justify-center items-center px-6 py-16 text-center">
      <div className="flex flex-col items-start">
        <Reveal>
          <p className="font-heading text-3xl font-medium leading-snug text-gray-500 md:text-6xl text-start">
            Memperbaiki yang salah dari pendampingan obat.
          </p>
        </Reveal>
        <motion.div
          variants={staggerParent(0.12, 0.1)}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          {PILLS.map((p) => (
            <motion.span
              key={p.label}
              variants={revealItem}
              className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-2xl font-bold md:text-5xl ${p.bg}`}
            >
              <p.icon aria-hidden className="h-[1em] w-[1em]" />
              {p.label}
            </motion.span>
          ))}
        </motion.div>
        <Reveal delay={0.15}>
          <p className="mt-8 font-heading text-3xl font-medium leading-snug text-gray-500 md:text-5xl">
            Begini cara penanganan yang ideal.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
