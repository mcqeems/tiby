"use client";

import { useEffect, useRef } from "react";
import { ReactLenis } from "lenis/react";
import { frame, cancelFrame } from "motion/react";
import "lenis/dist/lenis.css";

/**
 * Landing-only smooth scroll. Driven from Motion's frame loop in the `setup`
 * step (before Motion's `read`), so scroll-linked `useScroll` animations stay
 * on the current frame instead of lagging one behind.
 * See https://motion.dev/docs/lenis
 */
export default function SmoothScroll({
  children,
}: {
  children: React.ReactNode;
}) {
  const lenisRef = useRef<{ lenis?: { raf: (t: number) => void } } | null>(
    null,
  );

  useEffect(() => {
    function update({ timestamp }: { timestamp: number }) {
      lenisRef.current?.lenis?.raf(timestamp);
    }
    frame.setup(update, true);
    return () => cancelFrame(update);
  }, []);

  return (
    <ReactLenis root options={{ autoRaf: false }} ref={lenisRef as never}>
      {children}
    </ReactLenis>
  );
}
