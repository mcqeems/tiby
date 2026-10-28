"use client";

import { useState, useEffect } from "react";
import { fadeDown, listItem, staggerParent } from "@/lib/motion";
import { ModalCard, ModalOverlay } from "@/components/ui/modal-frame";
import { AnimatePresence, motion } from "motion/react";
import { educationApi, type EducationItem } from "@/lib/api/education";
import PublicLoading from "@/components/ui/public-loading";
import Mascot from "@/components/mascot";
import {
  BookOpen,
  X,
  ArrowRight,
  Pill,
  HeartPulse,
  ShieldAlert,
  Clock,
} from "lucide-react";

export default function EducationView({
  role = "PASIEN",
}: {
  role?: "PASIEN" | "PMO";
}) {
  const [cards, setCards] = useState<EducationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<EducationItem | null>(null);

  useEffect(() => {
    let active = true;
    async function fetchEducation() {
      try {
        const res = await educationApi.getDaily();
        if (active) {
          setCards(res.cards || []);
        }
      } catch (error) {
        console.error("Gagal memuat edukasi:", error);
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchEducation();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <PublicLoading fullScreen message="Memuat materi edukasi..." />;
  }

  const getCategoryStyle = (category: string) => {
    switch (category) {
      case "ADHERENCE":
        return {
          icon: Pill,
          bg: "bg-tiby-teal-50",
          text: "text-tiby-teal-700",
          border: "border-tiby-teal-200",
          label: "Kepatuhan Obat",
        };
      case "SIDE_EFFECTS":
        return {
          icon: HeartPulse,
          bg: "bg-amber-50",
          text: "text-amber-700",
          border: "border-amber-200",
          label: "Efek Samping",
        };
      default:
        return {
          icon: ShieldAlert,
          bg: "bg-blue-50",
          text: "text-blue-700",
          border: "border-blue-200",
          label: "Informasi Umum",
        };
    }
  };

  return (
    <motion.div
      variants={staggerParent(0.06, 0.05)}
      initial="hidden"
      animate="visible"
      className="w-full space-y-8"
    >
      <motion.div
        variants={fadeDown}
        className="relative w-full overflow-hidden rounded-3xl bg-tiby-teal-600 p-8 sm:p-12 text-white shadow-xl shadow-tiby-teal-600/20"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 text-center md:text-left flex-1">
            <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight">
              {role === "PMO" ? "Pusat Edukasi PMO" : "Edukasi Harian"}
            </h1>
            <p className="text-tiby-teal-50/90 text-sm sm:text-base max-w-2xl mx-auto md:mx-0 leading-relaxed">
              {role === "PMO"
                ? "Tingkatkan pengetahuanmu untuk membimbing dan mendampingi pasien menuju kesembuhan total. Materi ini bersumber langsung dari Kemenkes dan WHO."
                : "Bacaan singkat dan terpercaya untuk menemanimu sembuh. Yuk, luangkan waktu 5 menit untuk membaca artikel di bawah ini!"}
            </p>
          </div>
          <div className="shrink-0 flex items-center justify-center">
            <Mascot
              animated
              emotion="wave"
              loop={false}
              size={160}
              className="drop-shadow-2xl"
            />
          </div>
        </div>
      </motion.div>

      {cards.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-3xl border border-gray-200 w-full shadow-2xs">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-heading text-lg font-bold text-tiby-ink">
            Belum Ada Materi
          </h3>
          <p className="text-sm text-tiby-muted mt-1">
            Saat ini belum ada materi edukasi yang tersedia.
          </p>
        </div>
      ) : (
        <motion.div
          variants={staggerParent(0.1, 0.1)}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full"
        >
          {cards.map((card) => {
            const style = getCategoryStyle(card.category);
            const Icon = style.icon;

            return (
              <motion.button
                key={card.id}
                variants={listItem}
                onClick={() => setSelectedCard(card)}
                className="group text-left bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-2xs hover:shadow-lg hover:border-tiby-teal-300 hover:-translate-y-1 transition-all duration-300 flex flex-col h-full"
              >
                <div className="flex items-start justify-between mb-6">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${style.bg} ${style.text} transition-transform group-hover:scale-110`}
                  >
                    <Icon className="w-7 h-7" />
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg">
                    <Clock className="w-3.5 h-3.5" />
                    {card.phase}
                  </div>
                </div>

                <div className="flex-1 space-y-3">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider ${style.text}`}
                  >
                    {style.label}
                  </span>
                  <h3 className="font-heading font-bold text-xl text-tiby-ink group-hover:text-tiby-teal-700 transition line-clamp-3 leading-snug">
                    {card.title}
                  </h3>
                  <p className="text-sm sm:text-base text-tiby-muted line-clamp-3 leading-relaxed">
                    {card.summary}
                  </p>
                </div>

                <div className="mt-8 pt-5 border-t border-gray-100 flex items-center justify-between text-tiby-teal-600 font-semibold text-sm">
                  <span>Baca Artikel</span>
                  <div className="w-8 h-8 rounded-full bg-tiby-teal-50 flex items-center justify-center group-hover:bg-tiby-teal-600 group-hover:text-white transition-colors">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </motion.button>
            );
          })}
        </motion.div>
      )}

      <AnimatePresence>
        {selectedCard && (
          <ModalOverlay
            label="Baca Materi Edukasi"
            onClose={() => setSelectedCard(null)}
            dismissOnBackdrop={false}
          >
            <ModalCard className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl bg-white shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 bg-gray-50/80 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-tiby-teal-100 flex items-center justify-center">
                    <BookOpen className="w-4.5 h-4.5 text-tiby-teal-700" />
                  </div>
                  <h3 className="font-heading font-bold text-tiby-ink truncate pr-4 text-lg sm:text-xl">
                    {selectedCard.title}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedCard(null)}
                  className="p-2 text-gray-400 hover:text-tiby-ink hover:bg-gray-200 rounded-full transition shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 sm:p-10 overflow-y-auto bg-white">
                <div className="prose prose-sm sm:prose-base prose-teal max-w-none">
                  {selectedCard.contentMarkdown
                    .split("\n")
                    .map((paragraph, idx) => {
                      if (paragraph.startsWith("###")) {
                        return (
                          <h4
                            key={idx}
                            className="font-heading font-bold text-xl text-tiby-ink mt-8 mb-4"
                          >
                            {paragraph.replace("###", "").trim()}
                          </h4>
                        );
                      }
                      if (paragraph.startsWith("**")) {
                        const text = paragraph.replace(/\*\*/g, "");
                        return (
                          <p
                            key={idx}
                            className="font-bold text-base text-tiby-ink mt-6 mb-2"
                          >
                            {text}
                          </p>
                        );
                      }
                      if (paragraph.startsWith("-")) {
                        return (
                          <li
                            key={idx}
                            className="text-base text-tiby-muted ml-4 mb-3 leading-relaxed"
                          >
                            {paragraph.replace("-", "").trim()}
                          </li>
                        );
                      }
                      if (paragraph.trim() === "") return <br key={idx} />;
                      return (
                        <p
                          key={idx}
                          className="text-base text-tiby-muted leading-relaxed mb-5"
                        >
                          {paragraph}
                        </p>
                      );
                    })}
                </div>
              </div>

              <div className="p-4 sm:p-6 border-t border-gray-100 bg-gray-50 shrink-0">
                <button
                  onClick={() => setSelectedCard(null)}
                  className="w-full h-12 bg-tiby-teal-600 text-white rounded-xl font-semibold text-sm hover:bg-tiby-teal-700 transition shadow-sm"
                >
                  Selesai Membaca
                </button>
              </div>
            </ModalCard>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
