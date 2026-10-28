import { useCallback, useEffect, useRef, useState } from "react";
import type { GuidanceResponse } from "@tiby/ts-shared";
import { guidanceApi } from "@/lib/api/guidance";
import { errorMessage } from "@/lib/errors";

/**
 * `idle` is the page before any question; a turn moves through `thinking` to
 * one of the terminal states. `cancelled` is first-class: stopping is a normal
 * action, not an error.
 */
export type GuidancePhase =
  | "idle"
  | "thinking"
  | "complete"
  | "refused"
  | "error"
  | "cancelled";

export interface GuidanceTurn {
  id: string;
  question: string;
  phase: GuidancePhase;
  answer: GuidanceResponse | null;
  error: string | null;
}

/** The response is grounded only when it came back with prose and sources. */
function phaseFor(answer: GuidanceResponse): GuidancePhase {
  return answer.answer && answer.grounded ? "complete" : "refused";
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : String(Date.now() + Math.random());

/**
 * One question at a time, with the finished turns kept so the user can compare
 * answers. Cancelling aborts the in-flight request - the backend bridge and the
 * AI service both stop working on it - and never writes a late result.
 */
export function useGuidance() {
  const [turns, setTurns] = useState<GuidanceTurn[]>([]);
  const [elapsedMs, setElapsedMs] = useState(0);
  const controllerRef = useRef<AbortController | null>(null);

  const thinking = turns.length > 0 && turns[turns.length - 1].phase === "thinking";

  const startedAtRef = useRef(0);

  useEffect(() => {
    if (!thinking) return;
    startedAtRef.current = performance.now();
    const timer = window.setInterval(
      () => setElapsedMs(performance.now() - startedAtRef.current),
      250,
    );
    return () => window.clearInterval(timer);
  }, [thinking]);

  // Leaving the page must not leave a request running.
  useEffect(() => () => controllerRef.current?.abort(), []);

  const patch = useCallback((id: string, next: Partial<GuidanceTurn>) => {
    setTurns((current) =>
      current.map((turn) => (turn.id === id ? { ...turn, ...next } : turn)),
    );
  }, []);

  const ask = useCallback(
    async (raw: string) => {
      const question = raw.trim();
      if (!question) return;

      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      const id = newId();
      setElapsedMs(0);
      setTurns((current) => [
        ...current,
        { id, question, phase: "thinking", answer: null, error: null },
      ]);

      try {
        const answer = await guidanceApi.ask({ question }, controller.signal);
        if (controller.signal.aborted) return;
        patch(id, { phase: phaseFor(answer), answer });
      } catch (err: unknown) {
        if (controller.signal.aborted || (err as Error)?.name === "AbortError") {
          patch(id, { phase: "cancelled" });
          return;
        }
        patch(id, {
          phase: "error",
          error: errorMessage(
            err,
            "Pandu belum bisa menjawab sekarang. Coba lagi nanti.",
          ),
        });
      } finally {
        if (controllerRef.current === controller) controllerRef.current = null;
      }
    },
    [patch],
  );

  const stop = useCallback(() => {
    controllerRef.current?.abort();
  }, []);

  /** Re-ask the same question as a fresh turn, keeping the old one for compare. */
  const retry = useCallback(
    (turn: GuidanceTurn) => {
      setTurns((current) => current.filter((item) => item.id !== turn.id));
      void ask(turn.question);
    },
    [ask],
  );

  const dismiss = useCallback((id: string) => {
    setTurns((current) => current.filter((turn) => turn.id !== id));
  }, []);

  return { turns, thinking, elapsedMs, ask, stop, retry, dismiss };
}
