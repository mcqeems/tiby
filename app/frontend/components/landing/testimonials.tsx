"use client";

import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import { EASE, SectionHeading } from "./shared";

const TESTIMONIALS = [
  {
    text: "Awalnya takut ketahuan tetangga. Tapi karena notifikasinya cuma 'Waktunya jaga kesehatan', jadi tenang.",
    name: "Rani",
    role: "Pasien",
  },
  {
    text: "Sebagai PMO, saya suka fitur management by exception. Cuma dapat notif kalau adik saya benar-benar butuh bantuan.",
    name: "Bagas",
    role: "PMO",
  },
  {
    text: "Dashboard triase sangat membantu. Pasien risiko tinggi langsung muncul di atas, jadi saya tahu siapa yang harus ditelepon dulu.",
    name: "dr. Maya",
    role: "Tenaga Kesehatan",
  },
];

export default function Testimonials() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <SectionHeading eyebrow="Testimoni">Kata Mereka</SectionHeading>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {TESTIMONIALS.map((t, i) => (
          <motion.figure
            key={t.name}
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.8, delay: i * 0.12, ease: EASE }}
            className="relative flex flex-col rounded-3xl border border-gray-100 bg-gradient-to-b from-white to-tiby-teal-50/40 p-7 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_24px_50px_-28px_rgba(15,118,110,0.3)]"
          >
            <Quote className="mb-4 h-6 w-6 text-tiby-teal-200" />
            <blockquote className="flex-1 text-sm leading-relaxed text-gray-600">
              &ldquo;{t.text}&rdquo;
            </blockquote>
            <figcaption className="mt-6 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-tiby-teal-100 text-sm font-bold text-tiby-teal-700">
                {t.name.replace("dr. ", "").charAt(0)}
              </span>
              <span className="leading-tight">
                <span className="block text-sm font-bold text-tiby-ink">
                  {t.name}
                </span>
                <span className="block text-xs text-gray-500">{t.role}</span>
              </span>
            </figcaption>
          </motion.figure>
        ))}
      </div>
    </section>
  );
}
