"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { educationApi, type EducationItem } from "@/lib/api/education";
import PublicLoading from "@/components/ui/public-loading";
import {
  BookOpen,
  X,
  ChevronRight,
  Pill,
  HeartPulse,
  ShieldAlert,
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

  if (loading)
    return <PublicLoading fullScreen message="Memuat materi edukasi..." />;

  // Fungsi menentukan ikon & warna kategori
  const getCategoryStyle = (category: string) => {
    switch (category) {
      case "ADHERENCE":
        return {
          icon: Pill,
          bg: "bg-tiby-teal-50",
          text: "text-tiby-teal-700",
          label: "Kepatuhan Obat",
        };
      case "SIDE_EFFECTS":
        return {
          icon: HeartPulse,
          bg: "bg-amber-50",
          text: "text-amber-700",
          label: "Efek Samping",
        };
      default:
        return {
          icon: ShieldAlert,
          bg: "bg-blue-50",
          text: "text-blue-700",
          label: "Informasi Umum",
        };
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24 md:pb-10">
      {/* Header Edukasi (Dinamis berdasarkan role) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-tiby-ink">
            {role === "PMO" ? "Pusat Edukasi PMO" : "Edukasi Harian"}
          </h1>
          <p className="mt-1 text-sm text-tiby-muted">
            {role === "PMO"
              ? "Bacaan singkat untuk membantumu mendampingi pasien."
              : "Bacaan singkat untuk menemanimu sembuh."}
          </p>
        </div>
        <div className="relative w-16 h-16 shrink-0">
          <Image
            src="/mascot/thinking/thinking.webp"
            alt="Pandu"
            fill
            className="object-contain"
          />
        </div>
      </div>

      {/* Daftar Kartu Edukasi */}
      <div className="grid gap-4">
        {cards.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-200">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="font-heading text-lg font-bold text-tiby-ink">
              Belum Ada Materi
            </h3>
            <p className="text-sm text-tiby-muted mt-1">
              Saat ini belum ada materi edukasi yang tersedia untuk fase Anda.
            </p>
          </div>
        ) : (
          cards.map((card) => {
            const style = getCategoryStyle(card.category);
            const Icon = style.icon;
            return (
              <button
                key={card.id}
                onClick={() => setSelectedCard(card)}
                className="text-left bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs hover:border-tiby-teal-300 hover:shadow-sm transition-all group flex items-start gap-4"
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${style.bg} ${style.text}`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${style.text}`}
                    >
                      {style.label}
                    </span>
                    <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-sm">
                      {card.phase}
                    </span>
                  </div>
                  <h3 className="font-heading font-bold text-base text-tiby-ink group-hover:text-tiby-teal-700 transition line-clamp-2">
                    {card.title}
                  </h3>
                  <p className="text-sm text-tiby-muted mt-1 line-clamp-2 leading-relaxed">
                    {card.summary}
                  </p>
                </div>
                <div className="mt-4 text-gray-300 group-hover:text-tiby-teal-600 transition">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* ─── MODAL BACA ARTIKEL ─── */}
      {selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-3xl bg-white shadow-xl overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50/50 shrink-0">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-tiby-teal-600" />
                <h3 className="font-heading font-bold text-tiby-ink truncate pr-4">
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

            <div className="p-6 overflow-y-auto">
              <div className="prose prose-sm prose-teal max-w-none">
                {/* Render Markdown sederhana */}
                {selectedCard.contentMarkdown
                  .split("\n")
                  .map((paragraph, idx) => {
                    if (paragraph.startsWith("###")) {
                      return (
                        <h4
                          key={idx}
                          className="font-heading font-bold text-lg text-tiby-ink mt-4 mb-2"
                        >
                          {paragraph.replace("###", "").trim()}
                        </h4>
                      );
                    }
                    if (paragraph.startsWith("**")) {
                      // Handle bold text sederhana
                      const text = paragraph.replace(/\*\*/g, "");
                      return (
                        <p
                          key={idx}
                          className="font-bold text-sm text-tiby-ink mt-3 mb-1"
                        >
                          {text}
                        </p>
                      );
                    }
                    if (paragraph.startsWith("-")) {
                      return (
                        <li
                          key={idx}
                          className="text-sm text-tiby-muted ml-4 mb-1"
                        >
                          {paragraph.replace("-", "").trim()}
                        </li>
                      );
                    }
                    if (paragraph.trim() === "") return <br key={idx} />;
                    return (
                      <p
                        key={idx}
                        className="text-sm text-tiby-muted leading-relaxed mb-3"
                      >
                        {paragraph}
                      </p>
                    );
                  })}
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 shrink-0">
              <button
                onClick={() => setSelectedCard(null)}
                className="w-full h-12 bg-tiby-teal-600 text-white rounded-xl font-semibold text-sm hover:bg-tiby-teal-700 transition"
              >
                Selesai Membaca
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
