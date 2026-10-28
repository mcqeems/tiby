"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus } from "lucide-react";
import { EASE, Reveal } from "./shared";

const FAQS = [
  {
    q: "Apakah data suara saya aman?",
    a: "Sangat aman. Kami hanya menyimpan hasil ekstraksi teks. Rekaman suara asli dihapus segera setelah diproses sesuai UU PDP.",
  },
  {
    q: "Bagaimana jika saya lupa check-in?",
    a: "Sistem akan mendeteksi keheningan (silence). Hari ke-1 Anda diingatkan via WA, hari ke-2 PMO dihubungi, dan hari ke-3 Faskes akan menerima tiket untuk kunjungan.",
  },
  {
    q: "Apakah aplikasi ini menggantikan dokter?",
    a: "Tidak. Tiby adalah alat bantu kepatuhan. Keputusan medis dan diagnosis tetap berada di tangan Tenaga Kesehatan.",
  },
  {
    q: "Mengapa tidak ada kata 'TBC' di aplikasi?",
    a: "Untuk melindungi privasi Anda. Kami mendesain antarmuka se-netral mungkin agar aman dilihat di tempat umum atau jika HP dipinjam orang lain.",
  },
];

export default function FAQ() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <section
      id="faq"
      className="mx-auto grid max-w-5xl scroll-mt-24 grid-cols-1 gap-10 px-6 py-20 md:grid-cols-3"
    >
      <div className="md:col-span-1">
        <Reveal className="sticky top-28">
          <span className="inline-flex rounded-full border border-tiby-teal-100 bg-tiby-teal-50/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-tiby-teal-700">
            FAQ
          </span>
          <h2 className="mt-4 font-heading text-3xl font-bold leading-tight tracking-tight">
            Pertanyaan yang Sering Muncul
          </h2>
        </Reveal>
      </div>

      <Reveal className="md:col-span-2" delay={0.1}>
        {FAQS.map((faq, i) => {
          const open = openFaq === i;
          return (
            <div key={faq.q} className="border-b border-gray-200/80">
              <button
                onClick={() => setOpenFaq(open ? null : i)}
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-4 py-5 text-left font-semibold text-tiby-ink transition-colors hover:text-tiby-teal-700"
              >
                <span>{faq.q}</span>
                <motion.span
                  animate={{ rotate: open ? 45 : 0 }}
                  transition={{ duration: 0.3, ease: EASE }}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tiby-teal-50 text-tiby-teal-700"
                >
                  <Plus className="h-4 w-4" />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.4, ease: EASE }}
                    className="overflow-hidden"
                  >
                    <p className="pb-5 pr-12 text-sm leading-relaxed text-gray-500">
                      {faq.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </Reveal>
    </section>
  );
}
