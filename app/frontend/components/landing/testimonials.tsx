"use client";

import { motion } from "motion/react";
import { SectionHeading } from "./shared";
import { VIEWPORT, revealItem, staggerParent } from "@/lib/motion";
import Image from "next/image";

const TESTIMONIALS = [
  {
    text: "Awalnya takut ketahuan tetangga. Tapi karena notifikasinya cuma 'Waktunya jaga kesehatan', jadi tenang.",
    name: "Nabil",
    role: "Pasien",
    tint: "bg-tiby-teal-100 text-tiby-teal-700",
    image: "/landing/nabil.jpg",
  },
  {
    text: "Sebagai PMO, saya suka fitur management by exception. Cuma dapat notif kalau adik saya benar-benar butuh bantuan.",
    name: "Farrel",
    role: "PMO",
    tint: "bg-amber-100 text-amber-700",
    image: "/landing/farrel.jpg",
  },
  {
    text: "Dashboard triase sangat membantu. Pasien risiko tinggi langsung muncul di atas, jadi saya tahu siapa yang harus ditelepon dulu.",
    name: "Athar",
    role: "Tenaga Kesehatan",
    tint: "bg-sky-100 text-sky-700",
    image: "/landing/athar.png",
  },
];

export default function Testimonials() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <SectionHeading
        line1="Apa Kata Mereka"
        line2="Tentang Tiby?"
        desc="Perkataan dari beberapa peserta simulasi yang pernah kita uji coba."
      />

      <motion.div
        variants={staggerParent(0.12, 0.05)}
        initial="hidden"
        whileInView="visible"
        viewport={VIEWPORT}
        className="grid grid-cols-1 gap-5 md:grid-cols-3"
      >
        {TESTIMONIALS.map((t) => (
          <motion.figure
            key={t.name}
            variants={revealItem}
            className="flex flex-col rounded-3xl bg-gray-100 p-7 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_24px_50px_-28px_rgba(0,0,0,0.20)]"
          >
            <blockquote className="flex-1 text-[15px] leading-relaxed text-gray-700">
              &ldquo;{t.text}&rdquo;
            </blockquote>
            <figcaption className="mt-6 flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${t.tint}`}
              >
                <Image
                  className="rounded-full"
                  src={t.image}
                  alt={t.name}
                  width={40}
                  height={40}
                />
              </div>
              <span className="leading-tight">
                <span className="block text-sm font-bold text-gray-900">
                  {t.name}
                </span>
                <span className="block text-xs text-gray-500">{t.role}</span>
              </span>
            </figcaption>
          </motion.figure>
        ))}
      </motion.div>
    </section>
  );
}
