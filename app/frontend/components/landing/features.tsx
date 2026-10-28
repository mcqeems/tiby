"use client";

import { motion } from "motion/react";
import { VIEWPORT, revealItem, staggerParent } from "@/lib/motion";
import {
  Mic,
  Activity,
  Lock,
  MessageSquare,
  Smartphone,
  BookOpen,
  type LucideIcon,
} from "lucide-react";
import { SectionHeading } from "./shared";

/* ─── Marquee ─── */
const MARQUEE_ITEMS = [
  "SUDAH_MINUM",
  "TERKENDALI",
  "SEHAT",
  "SEMBUH",
  "PATUH",
  "AMAN",
  "PRIVAT",
  "CERDAS",
];

function Marquee() {
  return (
    <div className="relative my-16 overflow-hidden py-4 [-webkit-mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)] [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
      <motion.div
        animate={{ x: ["0%", "-50%"] }}
        transition={{ repeat: Infinity, ease: "linear", duration: 32 }}
        className="flex w-max"
      >
        {[
          ...MARQUEE_ITEMS,
          ...MARQUEE_ITEMS,
          ...MARQUEE_ITEMS,
          ...MARQUEE_ITEMS,
        ].map((item, i) => (
          <span
            key={i}
            className="mr-4 inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-gray-100 bg-white px-6 py-2 font-mono text-sm text-gray-500 shadow-sm"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-tiby-teal-400" />
            {item}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/* ─── Feature Card ─── */
function FeatureCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: LucideIcon;
  title: string;
  desc: string;
}) {
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  return (
    <motion.div
      variants={revealItem}
      onMouseMove={onMove}
      className="group relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-7 transition-all duration-500 hover:-translate-y-1 hover:border-tiby-teal-100 hover:shadow-[0_24px_50px_-24px_rgba(15,118,110,0.25)]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(320px circle at var(--mx, 50%) var(--my, 50%), rgba(20,184,166,0.10), transparent 70%)",
        }}
      />
      <div className="relative">
        <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-tiby-teal-50 text-tiby-teal-700 transition-all duration-500 group-hover:rotate-3 group-hover:scale-110 group-hover:bg-tiby-teal-600 group-hover:text-white">
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="mb-2 text-lg font-bold">{title}</h3>
        <p className="text-sm leading-relaxed text-gray-500">{desc}</p>
      </div>
    </motion.div>
  );
}

const FEATURES: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: Mic,
    title: "Lapor Suara",
    desc: "Cukup bicara. AI kami mengekstrak keluhan dan jumlah obatmu secara otomatis.",
  },
  {
    icon: Activity,
    title: "Rule Engine",
    desc: "Sistem deterministik yang menilai tanda bahaya secara akurat tanpa halusinasi.",
  },
  {
    icon: Lock,
    title: "Privasi Terjaga",
    desc: "Nama pasien disamarkan. Notifikasi tidak menyebut 'TBC' agar aman di tempat umum.",
  },
  {
    icon: MessageSquare,
    title: "Eskalasi WA",
    desc: "Jika tidak lapor, bot otomatis menghubungi PMO dan Faskes melalui WhatsApp.",
  },
  {
    icon: Smartphone,
    title: "Kalender Visual",
    desc: "Pantau jejak kepatuhanmu seperti heatmap Github. Memotivasi untuk tetap konsisten.",
  },
  {
    icon: BookOpen,
    title: "Edukasi Valid",
    desc: "Materi bacaan harian bersumber langsung dari Kemenkes dan WHO.",
  },
];

export default function Features() {
  return (
    <>
      <Marquee />

      <section id="fitur" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-16">
        <SectionHeading
          eyebrow="Fitur"
          desc="Fitur komprehensif yang dirancang bukan hanya untuk memantau, tetapi untuk menyembuhkan."
        >
          Satu Aplikasi,{" "}
          <span className="text-tiby-teal-600">Semuanya Beres.</span>
        </SectionHeading>

        <motion.div
          variants={staggerParent(0.1, 0.05)}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT}
          className="grid grid-cols-1 gap-5 md:grid-cols-3"
        >
          {FEATURES.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </motion.div>
      </section>
    </>
  );
}
