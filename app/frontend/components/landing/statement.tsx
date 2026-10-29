"use client";

import { motion } from "motion/react";
import { Reveal } from "./shared";
import { VIEWPORT, staggerParent, revealItem } from "@/lib/motion";
import Mascot from "@/components/mascot";

const PILLS = [
  { emoji: "🎙️", label: "Suara", bg: "bg-blue-50 text-blue-500" },
  { emoji: "🛡️", label: "Privat", bg: "bg-tiby-teal-50 text-tiby-teal-600" },
  { emoji: "🏥", label: "Valid", bg: "bg-red-50 text-red-500" },
];

export default function Statement() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-16 text-center">
      <Reveal>
        <p className="font-heading text-3xl font-medium leading-snug text-gray-500 md:text-4xl">
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
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-2xl font-bold md:text-3xl ${p.bg}`}
          >
            <span aria-hidden>{p.emoji}</span>
            {p.label}
          </motion.span>
        ))}
      </motion.div>
      <Reveal delay={0.15}>
        <p className="mt-8 font-heading text-3xl font-medium leading-snug text-gray-500 md:text-4xl">
          Begini cara minum obat yang benar.
        </p>
      </Reveal>
      <Reveal delay={0.2} className="mt-8 flex justify-center">
        <Mascot emotion="wave" animated loop size={120} altText="Pandu" />
      </Reveal>
    </section>
  );
}
