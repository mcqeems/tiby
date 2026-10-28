"use client";

import { useState } from "react";
import { guidanceApi } from "@/lib/api/guidance";
import type { GuidanceResponse } from "@tiby/ts-shared";
import {
  AlertTriangle,
  BookOpen,
  ExternalLink,
  Loader2,
  MessageCircle,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const EXAMPLES = [
  "Apakah mual termasuk efek samping umum obat TB?",
  "Kenapa obat TB harus diminum setiap hari?",
  "Apa yang perlu dilakukan jika lupa minum obat?",
];

export default function GuidanceView() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<GuidanceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ask = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Tuliskan pertanyaan terlebih dahulu.");
      return;
    }
    if (trimmed.length > 3000) {
      setError("Pertanyaan maksimal 3000 karakter.");
      return;
    }

    setLoading(true);
    setError(null);
    setAnswer(null);
    try {
      const res = await guidanceApi.ask({ question: trimmed });
      setAnswer(res);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Pandu belum bisa menjawab sekarang. Coba lagi nanti.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-tiby-ink">
          Tanya Pandu
        </h1>
        <p className="mt-1 text-sm text-tiby-muted">
          Pertanyaan umum seputar pengobatan, dijawab dari panduan resmi
          Kemenkes/WHO. Bukan diagnosis dan bukan instruksi pengobatan pribadi.
        </p>
      </div>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
        <div className="border-b border-gray-100 bg-linear-to-r from-tiby-teal-50/70 to-white px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-tiby-teal-700 shadow-sm ring-1 ring-tiby-teal-100">
              <MessageCircle className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="font-heading text-sm font-semibold text-tiby-ink">
                Tanyakan hal umum
              </p>
              <p className="text-[11px] text-tiby-muted">
                Contoh: efek samping, makanan, kebiasaan minum obat.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-6">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={4}
            maxLength={3000}
            placeholder="Tulis pertanyaan Anda…"
            className="w-full resize-y rounded-xl border border-gray-200 px-4 py-3 text-sm text-tiby-ink outline-none placeholder:text-gray-400 focus:border-tiby-teal-600 focus:ring-4 focus:ring-tiby-teal-600/10"
          />

          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => {
                  setQuestion(example);
                  ask(example);
                }}
                disabled={loading}
                className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-[11px] font-medium text-tiby-muted transition hover:border-tiby-teal-200 hover:text-tiby-teal-700 disabled:opacity-50"
              >
                {example}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] text-tiby-muted">
              {question.length}/3000
            </span>
            <button
              type="button"
              onClick={() => ask(question)}
              disabled={loading || !question.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-tiby-teal-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-tiby-teal-700 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {loading ? "Mencari jawaban…" : "Tanya Pandu"}
            </button>
          </div>
        </div>
      </section>

      {loading && (
        <div className="flex items-start gap-3 rounded-2xl border border-tiby-teal-100 bg-tiby-teal-50/50 p-5 text-sm text-tiby-teal-800">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Pandu sedang mencari di panduan…</p>
            <p className="mt-0.5 text-xs text-tiby-teal-700">
              Pencarian bukti dan penyusunan jawaban bisa memakan waktu hingga
              satu menit.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {answer && (
        <section className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-tiby-teal-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-tiby-teal-700 ring-1 ring-tiby-teal-100">
                <ShieldCheck className="h-3 w-3" /> Jawaban Pandu
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                  answer.grounded
                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                    : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                }`}
              >
                {answer.grounded ? "Berbasis bukti" : "Bukti terbatas"}
              </span>
            </div>

            {answer.answer ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-tiby-ink">
                {answer.answer}
              </p>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <p className="font-semibold">Pandu belum bisa menjawab ini.</p>
                <p className="mt-1 text-xs leading-relaxed">
                  Pertanyaan pribadi tentang dosis atau mulai/berhenti/mengganti
                  obat tidak dijawab oleh Pandu. Silakan hubungi tenaga
                  kesehatan yang menangani Anda.
                </p>
              </div>
            )}
          </div>

          {answer.limitations.length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-5">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-tiby-muted">
                Catatan
              </p>
              <ul className="space-y-1.5">
                {answer.limitations.map((item) => (
                  <li
                    key={item}
                    className="flex gap-2 text-xs leading-relaxed text-tiby-muted"
                  >
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-tiby-muted" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {answer.citations.length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
              <div className="mb-3 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-tiby-teal-600" />
                <p className="font-heading text-sm font-semibold text-tiby-ink">
                  Sumber
                </p>
              </div>
              <ul className="space-y-2">
                {answer.citations.map((citation) => (
                  <li key={citation.citation_id}>
                    <a
                      href={citation.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-start gap-2 rounded-xl border border-gray-100 bg-gray-50/50 px-3 py-2.5 transition hover:border-tiby-teal-200 hover:bg-tiby-teal-50/40"
                    >
                      <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-tiby-teal-600" />
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold text-tiby-ink">
                          {citation.title}
                        </span>
                        <span className="block text-[11px] text-tiby-muted">
                          {citation.organization}
                          {citation.year ? ` · ${citation.year}` : ""}
                          {citation.page ? ` · hal. ${citation.page}` : ""}
                        </span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-center text-[11px] leading-relaxed text-tiby-muted">
            Informasi ini bersifat umum berdasarkan panduan resmi dan bukan
            penilaian untuk kasus pribadi. Untuk keluhan atau keputusan
            pengobatan, hubungi tenaga kesehatan Anda.
          </p>
        </section>
      )}
    </div>
  );
}
