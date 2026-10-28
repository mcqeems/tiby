"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { RotateCcw, Send, Square } from "lucide-react";
import ErrorNotice from "@/components/ui/error-notice";
import { fadeUp } from "@/lib/motion";
import { useGuidance, type GuidanceTurn } from "@/lib/use-guidance";
import { GuidanceAnswer, GuidanceRefusal } from "./guidance-answer";
import GuidanceEmpty from "./guidance-empty";
import GuidanceStatus from "./guidance-status";

const MAX_LENGTH = 3000;
const COUNTER_FROM = 2000;

const REFUSAL_SUGGESTIONS = [
  "Kenapa obat harus diminum setiap hari?",
  "Apa yang perlu dilakukan jika lupa minum obat?",
];

/** One line for screen readers when a turn stops being "thinking". */
function announceFor(turn: GuidanceTurn): string {
  switch (turn.phase) {
    case "complete":
      return "Jawaban Pandu sudah siap.";
    case "refused":
      return "Pandu belum bisa menjawab pertanyaan itu.";
    case "error":
      return "Terjadi kesalahan saat menghubungi Pandu.";
    case "cancelled":
      return "Pencarian dihentikan.";
    default:
      return "";
  }
}

function TurnQuestion({ question }: { question: string }) {
  return (
    <div className="flex justify-end">
      <p className="max-w-[85%] rounded-2xl rounded-br-md bg-tiby-teal-600 px-4 py-2.5 text-sm leading-relaxed text-white shadow-sm">
        {question}
      </p>
    </div>
  );
}

export default function GuidanceView() {
  const { turns, thinking, elapsedMs, ask, stop, retry } = useGuidance();
  const [question, setQuestion] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastTurnRef = useRef<HTMLDivElement>(null);

  const latest = turns[turns.length - 1];
  const announcement = latest ? announceFor(latest) : "";

  // Bring the newest turn into view once it exists; the answer arrives above the
  // composer, so without this the result can land off screen.
  useEffect(() => {
    if (!turns.length) return;
    lastTurnRef.current?.scrollIntoView({ block: "nearest" });
  }, [turns.length, latest?.phase]);

  const submit = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      setFieldError("Tuliskan pertanyaan terlebih dahulu.");
      textareaRef.current?.focus();
      return;
    }
    if (trimmed.length > MAX_LENGTH) {
      setFieldError(`Pertanyaan maksimal ${MAX_LENGTH} karakter.`);
      textareaRef.current?.focus();
      return;
    }
    setFieldError(null);
    setQuestion("");
    void ask(trimmed);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      submit(question);
      return;
    }
    if (event.key === "Escape" && thinking) {
      event.preventDefault();
      stop();
    }
  };

  return (
    <div className="flex min-h-full flex-col gap-5">
      <header>
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-tiby-ink">
          Tanya Pandu
        </h1>
        <p className="mt-1 text-sm text-tiby-muted">
          Jawaban dari panduan resmi Kemenkes dan WHO. Bukan diagnosis.
        </p>
      </header>

      {/* Announced once per finished turn, never while the label is ticking. */}
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      {turns.length === 0 ? (
        <GuidanceEmpty onPick={submit} disabled={thinking} />
      ) : (
        <div className="space-y-6">
          {turns.map((turn, index) => (
            <article key={turn.id} className="space-y-3">
              <TurnQuestion question={turn.question} />

              {turn.phase === "thinking" && (
                <GuidanceStatus elapsedMs={elapsedMs} onStop={stop} />
              )}

              {turn.phase === "complete" && turn.answer && (
                <GuidanceAnswer
                  answer={turn.answer}
                  latest={index === turns.length - 1}
                  onRetry={() => retry(turn)}
                />
              )}

              {turn.phase === "refused" && turn.answer && (
                <GuidanceRefusal
                  answer={turn.answer}
                  latest={index === turns.length - 1}
                  onRetry={() => retry(turn)}
                  onPick={submit}
                  suggestions={REFUSAL_SUGGESTIONS}
                />
              )}

              {turn.phase === "cancelled" && (
                <motion.div
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50/60 px-4 py-3"
                >
                  <p className="text-xs text-tiby-muted">
                    Pencarian dihentikan.
                  </p>
                  <button
                    type="button"
                    onClick={() => retry(turn)}
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-tiby-teal-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tiby-teal-600"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    Tanya ulang
                  </button>
                </motion.div>
              )}

              {turn.phase === "error" && (
                <ErrorNotice>
                  <p className="font-semibold">Pandu belum bisa dihubungi.</p>
                  <p className="mt-0.5 leading-relaxed">{turn.error}</p>
                  <button
                    type="button"
                    onClick={() => retry(turn)}
                    className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold underline"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    Coba lagi
                  </button>
                </ErrorNotice>
              )}
            </article>
          ))}
        </div>
      )}

      <div ref={lastTurnRef} aria-hidden="true" className="h-px" />

      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit(question);
        }}
        className="sticky bottom-20 z-20 mt-auto md:bottom-0"
      >
        <div className="rounded-2xl border border-gray-200 bg-white/90 p-3 shadow-[0_-4px_24px_rgba(15,60,60,0.08)] backdrop-blur">
          <label htmlFor="guidance-question" className="sr-only">
            Tulis pertanyaan Anda
          </label>
          <textarea
            id="guidance-question"
            ref={textareaRef}
            value={question}
            onChange={(event) => {
              setQuestion(event.target.value);
              if (fieldError) setFieldError(null);
            }}
            onKeyDown={handleKeyDown}
            rows={2}
            maxLength={MAX_LENGTH}
            placeholder="Tulis pertanyaan umum Anda..."
            aria-invalid={fieldError ? true : undefined}
            aria-describedby={fieldError ? "guidance-error" : undefined}
            className="max-h-40 w-full resize-none rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-tiby-ink outline-none placeholder:text-gray-400 focus:border-tiby-teal-600 focus:ring-4 focus:ring-tiby-teal-600/10"
          />

          {fieldError && (
            <p
              id="guidance-error"
              role="alert"
              className="mt-1.5 text-[11px] font-medium text-red-600"
            >
              {fieldError}
            </p>
          )}

          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-[11px] text-tiby-muted">
              {question.length >= COUNTER_FROM
                ? `${question.length}/${MAX_LENGTH}`
                : "Ctrl/⌘ + Enter untuk mengirim"}
            </span>

            {thinking ? (
              <button
                type="button"
                onClick={stop}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-tiby-ink transition hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tiby-teal-600"
              >
                <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                Hentikan
              </button>
            ) : (
              <button
                type="submit"
                disabled={!question.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-tiby-teal-600 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-tiby-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tiby-teal-600 disabled:opacity-50"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                Tanya Pandu
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
