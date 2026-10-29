"use client";

import { useRef } from "react";
import { motion } from "motion/react";
import Mascot from "@/components/mascot";
import { SectionHeading } from "./shared";
import { VIEWPORT, staggerParent, revealItem } from "@/lib/motion";

const PERSONAS = [
  {
    title: "Pasien",
    desc: "Lapor tanpa takut stigma sosial.",
    header: "bg-orange-500",
    sub: "text-orange-100",
  },
  {
    title: "PMO",
    desc: "Pantau status tanpa membaca obrolan.",
    header: "bg-slate-500",
    sub: "text-slate-100",
  },
  {
    title: "Nakes",
    desc: "Triase risiko dan tindak lanjut.",
    header: "bg-blue-400",
    sub: "text-blue-50",
  },
];

function PersonaCard({
  title,
  desc,
  header,
  sub,
}: {
  title: string;
  desc: string;
  header: string;
  sub: string;
}) {
  return (
    <motion.article
      variants={revealItem}
      className={`group w-[300px] shrink-0 snap-start overflow-hidden rounded-3xl ${header} p-6 text-white transition-transform duration-500 hover:-translate-y-2 md:w-[340px]`}
    >
      <h3 className="font-heading text-2xl font-bold">{title}</h3>
      <p className={`mt-1 text-sm ${sub}`}>{desc}</p>
      <div className="mt-5 overflow-hidden rounded-2xl bg-white/20">
        <div className="flex h-56 items-center justify-center transition-transform duration-500 group-hover:scale-105 group-hover:rotate-1">
          <Mascot emotion="idle" animated loop size={160} altText="Pandu" />
        </div>
      </div>
    </motion.article>
  );
}

export default function Personas() {
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollNext = () => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: 360, behavior: "smooth" });
  };

  return (
    <section id="peran" className="scroll-mt-24 overflow-hidden py-20">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading line1="Pendampingan Untuk" line2="Semua Peran." />
      </div>

      <motion.div
        variants={staggerParent(0.12, 0.05)}
        initial="hidden"
        whileInView="visible"
        viewport={VIEWPORT}
        className="relative"
      >
        <div
          ref={trackRef}
          className="flex snap-x snap-mandatory gap-5 overflow-x-auto px-6 pb-4 md:justify-center [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {PERSONAS.map((p) => (
            <PersonaCard key={p.title} {...p} />
          ))}
        </div>
      </motion.div>
    </section>
  );
}
