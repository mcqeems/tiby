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
      className="mx-auto grid max-w-6xl scroll-mt-24 grid-cols-1 gap-10 px-6 py-20 md:grid-cols-5"
    >
      <div className="md:col-span-2">
        <Reveal className="md:sticky md:top-28">
          <h2 className="font-sans text-3xl font-bold leading-tight tracking-tight text-gray-900 md:text-4xl">
            Pertanyaan yang
            <br />
            Sering Muncul
          </h2>
        </Reveal>
      </div>

      <Reveal className="md:col-span-3" delay={0.1}>
        <div className="space-y-3">
          {FAQS.map((faq, i) => {
            const open = openFaq === i;
            return (
              <div
                key={faq.q}
                className={`overflow-hidden rounded-2xl transition-colors duration-300 ${
                  open ? "bg-gray-50" : "bg-transparent"
                }`}
              >
                <button
                  onClick={() => setOpenFaq(open ? null : i)}
                  aria-expanded={open}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-[15px] font-semibold text-gray-900 transition-colors hover:text-tiby-teal-600"
                >
                  <span>{faq.q}</span>
                  <motion.span
                    animate={{ rotate: open ? 45 : 0 }}
                    transition={{ duration: 0.3, ease: EASE }}
                    className="flex h-6 w-6 shrink-0 items-center justify-center text-gray-400"
                  >
                    <Plus className="h-5 w-5" />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: EASE }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-5 text-sm leading-relaxed text-gray-500">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </Reveal>
    </section>
  );
}
