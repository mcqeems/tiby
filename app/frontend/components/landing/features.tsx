"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { VIEWPORT, staggerParent, revealItem } from "@/lib/motion";
import {
  Mic,
  BellRing,
  ShieldCheck,
  CalendarCheck2,
  Map,
  BookOpen,
  type LucideIcon,
} from "lucide-react";

const FEATURES: {
  icon: LucideIcon;
  title: string;
  desc: string;
  chip: string;
  fill: string;
  onFill: string;
}[] = [
  {
    icon: Mic,
    title: "Lapor Suara",
    desc: "Cukup bicara. AI kami mengekstrak keluhan dan jumlah obatmu secara otomatis.",
    chip: "bg-tiby-teal-100 text-tiby-teal-700",
    fill: "bg-tiby-teal-600",
    onFill: "#f1faf9",
  },
  {
    icon: BellRing,
    title: "Pengingat Pintar",
    desc: "Bot WhatsApp mengingatkan jadwalmu, lalu menghubungi PMO dan Faskes bila kamu hening.",
    chip: "bg-amber-100 text-amber-600",
    fill: "bg-amber-500",
    onFill: "#fffbeb",
  },
  {
    icon: ShieldCheck,
    title: "Privasi Terjaga",
    desc: "Nama pasien disamarkan. Notifikasi tidak menyebut 'TBC' agar aman di tempat umum.",
    chip: "bg-violet-100 text-violet-600",
    fill: "bg-violet-500",
    onFill: "#f5f3ff",
  },
  {
    icon: CalendarCheck2,
    title: "Streak Harian",
    desc: "Bangun streak kepatuhan hari demi hari. Hari yang penuh terkunci otomatis.",
    chip: "bg-rose-100 text-rose-600",
    fill: "bg-rose-500",
    onFill: "#fff1f2",
  },
  {
    icon: Map,
    title: "Peta Jalan Sembuh",
    desc: "180 hari terapi dipetakan jadi fase yang jelas. Kamu selalu tahu sudah sejauh mana.",
    chip: "bg-pink-100 text-pink-600",
    fill: "bg-pink-500",
    onFill: "#fdf2f8",
  },
  {
    icon: BookOpen,
    title: "Edukasi Valid",
    desc: "Materi bacaan harian bersumber langsung dari Kemenkes dan WHO.",
    chip: "bg-sky-100 text-sky-600",
    fill: "bg-sky-500",
    onFill: "#f0f9ff",
  },
];

function ShowcaseCard() {
  return (
    <motion.figure
      variants={revealItem}
      className="overflow-hidden rounded-3xl bg-gray-50"
    >
      <Image
        src="/landing/laptop-phone-mockup.png"
        alt="Tampilan aplikasi Tiby di laptop dan ponsel"
        width={1792}
        height={1024}
        sizes="(min-width: 1024px) 72rem, 100vw"
        className="h-auto w-full object-contain"
        loading="lazy"
      />
    </motion.figure>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  desc,
  chip,
  fill,
  onFill,
}: {
  icon: LucideIcon;
  title: string;
  desc: string;
  chip: string;
  fill: string;
  onFill: string;
}) {
  return (
    <motion.div
      variants={revealItem}
      initial="rest"
      whileHover="hover"
      animate="rest"
      className="overflow-hidden rounded-3xl bg-gray-50 p-7"
    >
      <div className="relative h-full">
        {/* Ink drop: expands from the icon chip until it floods the card. */}
        <motion.span
          aria-hidden
          variants={{
            rest: { scale: 0, opacity: 1 },
            hover: { scale: 28, opacity: 1 },
          }}
          transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
          className={`pointer-events-none absolute top-[22px] left-0 h-11 w-11 origin-center rounded-full ${fill}`}
        />
        <motion.div
          variants={{
            rest: { opacity: 1, scale: 1, height: 44, marginBottom: 20 },
            hover: { opacity: 0, scale: 0.5, height: 0, marginBottom: 0 },
          }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          className={`flex h-11 w-11 items-center justify-center overflow-hidden rounded-full ${chip}`}
        >
          <Icon className="h-5 w-5" />
        </motion.div>
        <motion.div
          variants={{ rest: { y: 0 }, hover: { y: -6 } }}
          transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
          className="relative"
        >
          <motion.h3
            variants={{ rest: { color: "#111827" }, hover: { color: onFill } }}
            transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
            className="font-heading text-[15px] font-bold"
          >
            {title}
          </motion.h3>
          <motion.p
            variants={{
              rest: { color: "#6b7280", opacity: 1 },
              hover: { color: onFill, opacity: 0.85 },
            }}
            transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
            className="mt-1.5 text-sm leading-relaxed"
          >
            {desc}
          </motion.p>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default function Features() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-6 py-16">
        <motion.div
          variants={staggerParent(0.08, 0)}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT}
        >
          <ShowcaseCard />
        </motion.div>

        <motion.div
          variants={staggerParent(0.08, 0.05)}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT}
          className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3"
        >
          {FEATURES.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </motion.div>
      </section>
    </>
  );
}
