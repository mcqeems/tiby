"use client";

import { motion } from "motion/react";
import { VIEWPORT, staggerParent, revealItem } from "@/lib/motion";
import Mascot, { type MascotEmotion } from "@/components/mascot";
import {
  Mic,
  BellRing,
  ShieldCheck,
  CalendarCheck2,
  Map,
  BookOpen,
  type LucideIcon,
} from "lucide-react";

const PHONES: { emotion: MascotEmotion; caption: string }[] = [
  { emotion: "listening", caption: "Lapor Suara, Tetap Tenang." },
  { emotion: "idle", caption: "Jadwal Obat Terjaga" },
  { emotion: "empathy", caption: "Ditemani Setiap Hari" },
];

const FEATURES: {
  icon: LucideIcon;
  title: string;
  desc: string;
  tint: string;
}[] = [
  {
    icon: Mic,
    title: "Lapor Suara",
    desc: "Cukup bicara. AI kami mengekstrak keluhan dan jumlah obatmu secara otomatis.",
    tint: "bg-tiby-teal-50 text-tiby-teal-600",
  },
  {
    icon: BellRing,
    title: "Pengingat Pintar",
    desc: "Bot WhatsApp mengingatkan jadwalmu, lalu menghubungi PMO dan Faskes bila kamu hening.",
    tint: "bg-amber-50 text-amber-500",
  },
  {
    icon: ShieldCheck,
    title: "Privasi Terjaga",
    desc: "Nama pasien disamarkan. Notifikasi tidak menyebut 'TBC' agar aman di tempat umum.",
    tint: "bg-violet-50 text-violet-500",
  },
  {
    icon: CalendarCheck2,
    title: "Streak Harian",
    desc: "Bangun streak kepatuhan hari demi hari. Hari yang penuh terkunci otomatis.",
    tint: "bg-rose-50 text-rose-500",
  },
  {
    icon: Map,
    title: "Peta Jalan Sembuh",
    desc: "180 hari terapi dipetakan jadi fase yang jelas. Kamu selalu tahu sudah sejauh mana.",
    tint: "bg-pink-50 text-pink-500",
  },
  {
    icon: BookOpen,
    title: "Edukasi Valid",
    desc: "Materi bacaan harian bersumber langsung dari Kemenkes dan WHO.",
    tint: "bg-sky-50 text-sky-500",
  },
];

function PhoneMock({
  emotion,
  caption,
}: {
  emotion: MascotEmotion;
  caption: string;
}) {
  return (
    <motion.figure
      variants={revealItem}
      className="overflow-hidden rounded-3xl bg-gray-50"
    >
      <div className="flex aspect-[9/10] w-full items-center justify-center">
        <Mascot emotion={emotion} animated loop size={220} altText="Pandu" />
      </div>
      <figcaption className="px-6 py-5 text-center font-heading text-lg font-bold text-gray-900">
        {caption}
      </figcaption>
    </motion.figure>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  desc,
  tint,
}: {
  icon: LucideIcon;
  title: string;
  desc: string;
  tint: string;
}) {
  return (
    <motion.div
      variants={revealItem}
      className="group rounded-3xl bg-gray-50 p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-20px_rgba(0,0,0,0.15)]"
    >
      <div
        className={`mb-5 flex h-11 w-11 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110 ${tint}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-heading text-[15px] font-bold text-gray-900">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-gray-500">{desc}</p>
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
          className="grid grid-cols-1 gap-5 md:grid-cols-3"
        >
          {PHONES.map((p) => (
            <PhoneMock key={p.caption} {...p} />
          ))}
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
