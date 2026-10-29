"use client";

import { useRef } from "react";
import { motion } from "motion/react";
import Mascot from "@/components/mascot";
import { SectionHeading } from "./shared";
import { VIEWPORT, staggerParent, revealItem } from "@/lib/motion";
import Image from "next/image";

const PERSONAS = [
  {
    title: "Pasien",
    desc: "Lapor tanpa takut stigma sosial.",
    header: "bg-orange-500",
    sub: "text-orange-100",
    image: "/landing/pasien.png",
  },
  {
    title: "PMO",
    desc: "Pantau status tanpa membaca obrolan.",
    header: "bg-slate-500",
    sub: "text-slate-100",
    image: "/landing/pmo.png",
  },
  {
    title: "Nakes",
    desc: "Triase risiko dan tindak lanjut.",
    header: "bg-blue-400",
    sub: "text-blue-50",
    image: "/landing/nakes.png",
  },
];

function PersonaCard({
  title,
  desc,
  header,
  sub,
  image,
}: {
  title: string;
  desc: string;
  header: string;
  sub: string;
  image: string;
}) {
  return (
    <motion.article
      variants={revealItem}
      className={`group w-[300px] shrink-0 snap-start overflow-hidden rounded-3xl ${header} p-6 text-white transition-transform duration-500 hover:-translate-y-2 md:w-[340px] mt-4`}
    >
      <h3 className="font-heading text-2xl font-bold">{title}</h3>
      <p className={`mt-1 text-sm ${sub}`}>{desc}</p>
      <div className="mt-5 overflow-hidden rounded-2xl bg-white/20">
        <div className="flex h-56 items-center justify-center">
          <Image src={image} alt={title} height={400} width={400} />
        </div>
      </div>
    </motion.article>
  );
}

export default function Personas() {
  const trackRef = useRef<HTMLDivElement>(null);

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
          className="flex flex-col md:flex-row justify-center items-center gap-5  md:justify-center"
        >
          {PERSONAS.map((p) => (
            <PersonaCard key={p.title} {...p} />
          ))}
        </div>
      </motion.div>
    </section>
  );
}
