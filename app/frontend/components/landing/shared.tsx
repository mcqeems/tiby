"use client";

import { motion } from "framer-motion";

export const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function Reveal({
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
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.8, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

export function SectionHeading({
  eyebrow,
  children,
  desc,
}: {
  eyebrow: string;
  children: React.ReactNode;
  desc?: string;
}) {
  return (
    <Reveal className="mx-auto mb-14 max-w-2xl text-center">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-tiby-teal-100 bg-tiby-teal-50/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-tiby-teal-700">
        {eyebrow}
      </span>
      <h2 className="mt-4 font-heading text-3xl font-bold leading-tight tracking-tight md:text-5xl">
        {children}
      </h2>
      {desc && (
        <p className="mx-auto mt-4 max-w-lg text-gray-500 leading-relaxed">
          {desc}
        </p>
      )}
    </Reveal>
  );
}
