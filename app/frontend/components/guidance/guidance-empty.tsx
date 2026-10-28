"use client";

import { motion } from "motion/react";
import Mascot from "@/components/mascot";
import { Sparkles } from "lucide-react";
import { listItem, staggerParent } from "@/lib/motion";

/**
 * Starter questions, grouped by what people actually wonder about. Clicking one
 * asks it straight away - the point of the empty state is to remove the blank
 * page, not to fill the box for them.
 */
const GROUPS: { label: string; hint: string; items: string[] }[] = [
  {
    label: "Minum obat",
    hint: "Cara dan waktu",
    items: [
      "Kenapa obat harus diminum setiap hari?",
      "Bolehkah diminum bersamaan dengan makanan?",
    ],
  },
  {
    label: "Kalau lupa",
    hint: "Melewatkan satu dosis",
    items: [
      "Apa yang perlu dilakukan jika lupa minum obat?",
      "Bagaimana kalau obat diminum terlambat?",
    ],
  },
  {
    label: "Efek samping",
    hint: "Keluhan yang umum",
    items: [
      "Apakah mual termasuk efek samping yang umum?",
      "Apa yang biasanya dianjurkan saat kulit terasa gatal?",
    ],
  },
];

export default function GuidanceEmpty({
  onPick,
  disabled = false,
}: {
  onPick: (question: string) => void;
  disabled?: boolean;
}) {
  return (
    <section className="space-y-6">
      <motion.div
        variants={staggerParent(0.08, 0.05)}
        initial="hidden"
        animate="visible"
        className="flex flex-col items-center gap-5 rounded-3xl border border-tiby-teal-100 bg-linear-to-b from-tiby-teal-50/70 to-white px-6 py-8 text-center sm:flex-row sm:items-center sm:gap-7 sm:text-left"
      >
        <motion.div variants={listItem} className="shrink-0">
          {/* Greeting, not a loop: plays once and rests on the last frame. */}
          <Mascot
            emotion="wave"
            animated
            loop={false}
            size={140}
            priority
            altText="Pandu melambai"
            className="drop-shadow-lg"
          />
        </motion.div>

        <motion.div variants={listItem} className="min-w-0 space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-tiby-teal-100 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-tiby-teal-700">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            Pandu siap menjawab
          </span>
          <h2 className="font-heading text-xl font-bold tracking-tight text-tiby-ink sm:text-2xl">
            Mau tanya apa hari ini?
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-tiby-muted">
            Pandu menjawab pertanyaan umum seputar pengobatan dari panduan resmi
            Kemenkes dan WHO. Bukan diagnosis, dan bukan instruksi untuk kasus
            pribadi Anda.
          </p>
        </motion.div>
      </motion.div>

      <motion.div
        variants={staggerParent(0.08, 0.15)}
        initial="hidden"
        animate="visible"
        className="grid gap-3 sm:grid-cols-3"
      >
        {GROUPS.map((group) => (
          <motion.div
            key={group.label}
            variants={listItem}
            className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs"
          >
            <p className="font-heading text-sm font-semibold text-tiby-ink">
              {group.label}
            </p>
            <p className="mb-3 text-[11px] text-tiby-muted">{group.hint}</p>
            <ul className="space-y-2">
              {group.items.map((item) => (
                <li key={item}>
                  <button
                    type="button"
                    onClick={() => onPick(item)}
                    disabled={disabled}
                    className="w-full rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2 text-left text-xs leading-relaxed text-tiby-ink transition hover:border-tiby-teal-200 hover:bg-tiby-teal-50/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tiby-teal-600 disabled:opacity-50"
                  >
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
