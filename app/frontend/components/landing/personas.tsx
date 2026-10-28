"use client";

import { motion } from "framer-motion";
import {
  UserCheck,
  ShieldCheck,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";
import Mascot, { type MascotEmotion } from "@/components/mascot";
import { EASE, SectionHeading } from "./shared";

const PERSONAS: {
  icon: LucideIcon;
  title: string;
  desc: string;
  gradient: string;
  emotion: MascotEmotion;
}[] = [
  {
    icon: UserCheck,
    title: "Pasien",
    desc: "Lapor tanpa takut stigma sosial.",
    gradient: "from-teal-500 to-teal-700",
    emotion: "idle",
  },
  {
    icon: ShieldCheck,
    title: "PMO",
    desc: "Pantau status tanpa membaca obrolan.",
    gradient: "from-sky-500 to-sky-700",
    emotion: "empathy",
  },
  {
    icon: Stethoscope,
    title: "Tenaga Kesehatan",
    desc: "Triase risiko dan tiket tindak lanjut.",
    gradient: "from-indigo-400 to-indigo-600",
    emotion: "listening",
  },
];

export default function Personas() {
  return (
    <section id="peran" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-20">
      <SectionHeading eyebrow="Untuk Semua">
        Pendampingan untuk{" "}
        <span className="text-tiby-teal-600">Semua Peran.</span>
      </SectionHeading>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {PERSONAS.map((p, i) => (
          <motion.div
            key={p.title}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.8, delay: i * 0.12, ease: EASE }}
            className={`group relative flex h-[340px] flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br ${p.gradient} p-7 text-white shadow-lg shadow-black/5 transition-transform duration-500 hover:-translate-y-2`}
          >
            <span
              aria-hidden
              className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 transition-transform duration-700 group-hover:scale-125"
            />
            <span
              aria-hidden
              className="absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-white/5"
            />
            <div className="relative z-10">
              <p.icon className="mb-4 h-8 w-8 opacity-80" />
              <h3 className="font-heading text-2xl font-bold">{p.title}</h3>
              <p className="mt-1 max-w-[12rem] text-sm text-white/80">
                {p.desc}
              </p>
            </div>
            <div className="absolute -bottom-4 -right-4 h-40 w-40 transition-transform duration-500 group-hover:-translate-y-2 group-hover:rotate-3">
              <Mascot
                animated
                emotion={p.emotion}
                loop={false}
                fill
                altText="Pandu"
                className="drop-shadow-xl"
              />
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
