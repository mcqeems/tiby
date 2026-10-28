"use client";

import { motion } from "motion/react";
import { Clock, Square } from "lucide-react";
import Mascot from "@/components/mascot";
import { formatElapsed, thinkingStatus } from "@/lib/guidance";
import { fadeUp } from "@/lib/motion";

/**
 * The wait. Streaming is not available here - the answer is validated JSON and
 * every guard failure is fail-closed - so instead of a spinner the wait is made
 * legible: a thinking Pandu, a label that escalates with elapsed time, a timer
 * and a way out.
 */
export default function GuidanceStatus({
  elapsedMs,
  onStop,
  mascotSize = 96,
}: {
  elapsedMs: number;
  onStop: () => void;
  mascotSize?: number;
}) {
  const status = thinkingStatus(elapsedMs);

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="overflow-hidden rounded-2xl border border-tiby-teal-100 bg-tiby-teal-50/50"
    >
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <div className="flex shrink-0 items-center justify-center">
          {/* Static thinking art; the blink is the only motion, and only when
              the user has not asked for reduced motion. */}
          <Mascot
            emotion="thinking"
            size={mascotSize}
            altText="Pandu sedang berpikir"
            className="motion-safe:animate-blink"
          />
        </div>

        <div className="min-w-0 flex-1">
          <p
            role="status"
            aria-live="polite"
            className="font-heading text-sm font-semibold text-tiby-teal-800"
          >
            {status.label}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-tiby-teal-700">
            {status.detail}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium tabular-nums text-tiby-teal-700">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {formatElapsed(elapsedMs)}
            </span>
            {status.canStop && (
              <button
                type="button"
                onClick={onStop}
                className="inline-flex items-center gap-1.5 rounded-full border border-tiby-teal-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-tiby-teal-700 transition hover:bg-tiby-teal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tiby-teal-600"
              >
                <Square className="h-3 w-3 fill-current" aria-hidden="true" />
                Hentikan
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
