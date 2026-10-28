"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  BookOpen,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Info,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import type { GuidanceResponse } from "@tiby/ts-shared";
import Mascot from "@/components/mascot";
import { evidenceFor, splitAnswerCitations } from "@/lib/guidance";
import { banner, fadeUp, listItem, staggerParent } from "@/lib/motion";

const DISCLAIMER =
  "Informasi ini bersifat umum berdasarkan panduan resmi dan bukan penilaian untuk kasus pribadi. Untuk keluhan atau keputusan pengobatan, hubungi tenaga kesehatan Anda.";

interface AnswerProps {
  answer: GuidanceResponse;
  /** Only the newest turn animates its mascot, so a long session stays cheap. */
  latest?: boolean;
  onRetry: () => void;
}

/** Turns `src-1` markers into chips that open the matching note below. */
function AnswerBody({
  answer,
  onOpenSource,
}: {
  answer: GuidanceResponse;
  onOpenSource: (citationId: string) => void;
}) {
  const segments = splitAnswerCitations(answer.answer ?? "", answer.citations);

  return (
    <p className="whitespace-pre-wrap text-sm leading-relaxed text-tiby-ink">
      {segments.map((segment, i) =>
        segment.kind === "text" ? (
          <span key={i}>{segment.text}</span>
        ) : (
          <button
            key={i}
            type="button"
            onClick={() => onOpenSource(segment.id)}
            aria-label={`Lihat sumber ${segment.number ?? segment.id}`}
            className={`mx-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 align-super text-[10px] font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tiby-teal-600 ${
              segment.number
                ? "bg-tiby-teal-100 text-tiby-teal-700 hover:bg-tiby-teal-600 hover:text-white"
                : "cursor-help bg-gray-100 text-gray-500"
            }`}
          >
            {segment.number ?? "?"}
          </button>
        ),
      )}
    </p>
  );
}

function Sources({
  answer,
  open,
  onToggle,
}: {
  answer: GuidanceResponse;
  open: Record<string, boolean>;
  onToggle: (citationId: string) => void;
}) {
  return (
    <motion.div
      variants={fadeUp}
      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs"
    >
      <div className="mb-3 flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-tiby-teal-600" aria-hidden="true" />
        <p className="font-heading text-sm font-semibold text-tiby-ink">
          Sumber ({answer.citations.length})
        </p>
      </div>

      <ul className="space-y-2">
        {answer.citations.map((citation, i) => {
          const snippet = evidenceFor(citation.citation_id, answer.evidence);
          const expanded = Boolean(open[citation.citation_id]);
          const panelId = `evidence-${citation.citation_id}`;

          return (
            <li
              key={citation.citation_id}
              id={`source-${citation.citation_id}`}
              className="scroll-mt-24 rounded-xl border border-gray-100 bg-gray-50/50"
            >
              <div className="flex items-start gap-3 p-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-tiby-teal-100 text-[10px] font-bold text-tiby-teal-700">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold leading-snug text-tiby-ink">
                    {citation.title}
                  </p>
                  <p className="mt-0.5 text-[11px] text-tiby-muted">
                    {citation.organization}
                    {citation.year ? ` · ${citation.year}` : ""}
                    {citation.page ? ` · hal. ${citation.page}` : ""}
                    {citation.section ? ` · ${citation.section}` : ""}
                  </p>

                  <div className="mt-1.5 flex flex-wrap items-center gap-3">
                    {snippet && (
                      <button
                        type="button"
                        onClick={() => onToggle(citation.citation_id)}
                        aria-expanded={expanded}
                        aria-controls={panelId}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-tiby-teal-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tiby-teal-600"
                      >
                        <ChevronDown
                          className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
                          aria-hidden="true"
                        />
                        {expanded ? "Sembunyikan kutipan" : "Lihat kutipan"}
                      </button>
                    )}
                    <a
                      href={citation.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-tiby-muted hover:text-tiby-teal-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tiby-teal-600"
                    >
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      Buka dokumen
                    </a>
                  </div>
                </div>
              </div>

              <AnimatePresence initial={false}>
                {expanded && snippet && (
                  <motion.div
                    key="evidence"
                    variants={banner}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    id={panelId}
                    className="border-t border-gray-100 px-3 pb-3 pt-2"
                  >
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-tiby-muted">
                      Kutipan yang dipakai Pandu
                    </p>
                    <blockquote className="border-l-2 border-tiby-teal-200 pl-3 text-xs italic leading-relaxed text-tiby-muted">
                      {snippet}
                    </blockquote>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    </motion.div>
  );
}

/** Grounded answer: prose with inline citation chips, evidence, sources, actions. */
export function GuidanceAnswer({ answer, latest = false, onRetry }: AnswerProps) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);

  const toggle = (citationId: string) =>
    setOpen((current) => ({ ...current, [citationId]: !current[citationId] }));

  const openSource = (citationId: string) => {
    setOpen((current) => ({ ...current, [citationId]: true }));
    const target = document.getElementById(`source-${citationId}`);
    target?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    target?.querySelector<HTMLElement>("button")?.focus({ preventScroll: true });
  };

  const copy = async () => {
    const sources = answer.citations
      .map(
        (citation, i) =>
          `${i + 1}. ${citation.title} — ${citation.organization}${citation.year ? `, ${citation.year}` : ""}${citation.source_url ? ` (${citation.source_url})` : ""}`,
      )
      .join("\n");
    try {
      await navigator.clipboard.writeText(
        `${answer.answer ?? ""}\n\nSumber:\n${sources}`,
      );
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <motion.section
      variants={staggerParent(0.06, 0.05)}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      <motion.div
        variants={listItem}
        className="overflow-hidden rounded-2xl border border-tiby-teal-100 bg-white shadow-sm"
      >
        <div className="flex items-start gap-4 border-b border-tiby-teal-100/70 bg-linear-to-r from-tiby-teal-50/80 to-white px-5 py-4">
          {latest && (
            <div className="hidden shrink-0 sm:block">
              {/* Answer present: the idle loop runs while the user reads. */}
              <Mascot
                emotion="idle"
                animated
                size={64}
                altText="Pandu menjawab"
              />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-tiby-teal-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-tiby-teal-700 ring-1 ring-tiby-teal-100">
                <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                Jawaban Pandu
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
                Berbasis bukti
              </span>
            </div>

            <div className="mt-3">
              <AnswerBody answer={answer} onOpenSource={openSource} />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 px-5 py-3">
          <button
            type="button"
            onClick={() => void copy()}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-tiby-ink transition hover:border-tiby-teal-200 hover:bg-tiby-teal-50/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tiby-teal-600"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
            ) : (
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {copied ? "Tersalin" : "Salin jawaban + sumber"}
          </button>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-tiby-ink transition hover:border-tiby-teal-200 hover:bg-tiby-teal-50/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tiby-teal-600"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Tanya ulang
          </button>
        </div>
      </motion.div>

      {answer.limitations.length > 0 && (
        <motion.div
          variants={fadeUp}
          className="rounded-2xl border border-gray-200 bg-gray-50/60 p-5"
        >
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-tiby-muted">
            <Info className="h-3.5 w-3.5" aria-hidden="true" />
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
        </motion.div>
      )}

      {answer.citations.length > 0 && (
        <Sources answer={answer} open={open} onToggle={toggle} />
      )}

      <motion.p
        variants={fadeUp}
        className="text-center text-[11px] leading-relaxed text-tiby-muted"
      >
        {DISCLAIMER}
      </motion.p>
    </motion.section>
  );
}

/**
 * Fail-closed answer (`answer: null`). The specific reason is the point of this
 * state, so the limitations lead and the next step is a real one.
 */
export function GuidanceRefusal({
  answer,
  latest = false,
  onRetry,
  onPick,
  suggestions,
}: AnswerProps & {
  onPick: (question: string) => void;
  suggestions: string[];
}) {
  return (
    <motion.section
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/60"
    >
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
        {latest && (
          <div className="hidden shrink-0 sm:block">
            <Mascot
              emotion="empathy"
              animated
              size={64}
              altText="Pandu meminta maaf"
              className="drop-shadow-sm"
            />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-800">
            <ShieldAlert className="h-3 w-3" aria-hidden="true" />
            {answer.limitations.length > 0
              ? "Di luar cakupan Pandu"
              : "Bukti belum cukup"}
          </span>

          <p className="mt-3 text-sm font-semibold text-amber-900">
            {answer.limitations.length > 0
              ? "Pertanyaan ini tidak dijawab Pandu."
              : "Pandu belum menemukan jawaban di panduan resmi."}
          </p>

          {answer.limitations.length > 0 ? (
            <ul className="mt-2 space-y-1.5">
              {answer.limitations.map((item) => (
                <li
                  key={item}
                  className="text-xs leading-relaxed text-amber-800"
                >
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-xs leading-relaxed text-amber-800">
              Coba tanyakan dengan kata lain, atau hubungi tenaga kesehatan yang
              menangani Anda untuk pertanyaan tentang kasus Anda sendiri.
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-amber-800 transition hover:bg-amber-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Coba tanya lagi
            </button>
            {suggestions.slice(0, 2).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onPick(item)}
                className="rounded-full border border-amber-200 bg-amber-100/60 px-3 py-1.5 text-[11px] font-medium text-amber-900 transition hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
}
