"use client";

import { motion } from "motion/react";
import { TRANS, VIEWPORT } from "@/lib/motion";

/** Scroll-triggered reveal. One implementation for landing and internal pages. */
export default function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y },
        visible: { opacity: 1, y: 0, transition: { ...TRANS.reveal, delay } },
      }}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT}
    >
      {children}
    </motion.div>
  );
}
