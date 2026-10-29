"use client";

import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import { Mic, ShieldCheck, BadgeCheck, type LucideIcon } from "lucide-react";

const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function useSegment(progress: MotionValue<number>, from: number, to: number) {
  return useTransform(progress, [from, to], [0, 1]);
}

function Opener({ progress }: { progress: MotionValue<number> }) {
  const t = useSegment(progress, 0.02, 0.22);
  const opacity = useTransform(t, [0, 1], [0, 1]);
  const y = useTransform(t, [0, 1], [24, 0]);
  return (
    <motion.p
      style={{ opacity, y }}
      className="font-heading text-3xl font-medium leading-snug text-gray-500 md:text-6xl text-start"
    >
      Memperbaiki yang salah dari pendampingan obat.
    </motion.p>
  );
}

function BlurPill({
  progress,
  icon: Icon,
  label,
  bg,
}: {
  progress: MotionValue<number>;
  icon: LucideIcon;
  label: string;
  bg: string;
}) {
  const t = useSegment(progress, 0.28, 0.4);
  const opacity = useTransform(t, [0, 1], [0, 1]);
  const scale = useTransform(t, [0, 1], [0.9, 1]);
  const blur = useTransform(t, [0, 1], [12, 0]);
  const filter = useTransform(blur, (b) => `blur(${b}px)`);
  return (
    <motion.span
      style={{ opacity, scale, filter }}
      className={`inline-flex items-center gap-2 rounded-full px-2 py-2 text-xl font-bold md:text-5xl ${bg}`}
    >
      <Icon aria-hidden className="h-[1em] w-[1em]" />
      {label}
    </motion.span>
  );
}

function ShinePill({
  progress,
  icon: Icon,
  label,
  bg,
}: {
  progress: MotionValue<number>;
  icon: LucideIcon;
  label: string;
  bg: string;
}) {
  const t = useSegment(progress, 0.42, 0.54);
  const opacity = useTransform(t, [0, 1], [0, 1]);
  const y = useTransform(t, [0, 1], [24, 0]);
  // Shine sweeps after the pill lands (second half of its window).
  const shineX = useTransform(progress, [0.48, 0.7], ["-150%", "170%"]);
  return (
    <motion.span
      style={{ opacity, y }}
      className={`relative inline-flex items-center gap-2 overflow-hidden rounded-full px-2 py-2 text-xl font-bold md:text-5xl ${bg}`}
    >
      <Icon aria-hidden className="h-[1em] w-[1em]" />
      {label}
      <motion.span
        aria-hidden
        style={{ x: shineX }}
        className="pointer-events-none absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/70 to-transparent"
      />
    </motion.span>
  );
}

function ScramblePill({
  progress,
  icon: Icon,
  label,
  bg,
}: {
  progress: MotionValue<number>;
  icon: LucideIcon;
  label: string;
  bg: string;
}) {
  const t = useSegment(progress, 0.56, 0.68);
  const opacity = useTransform(t, [0, 1], [0, 1]);
  // Each character resolves left-to-right across the window.
  const chars = label.split("");
  return (
    <motion.span
      style={{ opacity }}
      className={`inline-flex items-center gap-2 rounded-full px-2 py-2 text-xl font-bold md:text-5xl ${bg}`}
    >
      <Icon aria-hidden className="h-[1em] w-[1em]" />
      <span>
        {chars.map((c, i) => (
          <ScrambleChar
            key={i}
            progress={progress}
            index={i}
            total={chars.length}
            char={c}
          />
        ))}
      </span>
    </motion.span>
  );
}

function ScrambleChar({
  progress,
  index,
  total,
  char,
}: {
  progress: MotionValue<number>;
  index: number;
  total: number;
  char: string;
}) {
  // Spread the per-character resolve across 0.56 → 0.68.
  const from = 0.56 + (index / total) * 0.08;
  const to = from + 0.04;
  const t = useTransform(progress, [from, to], [0, 1]);
  const display = useTransform(t, (v) => {
    if (v >= 1 || char === " ") return char;
    // Deterministic pseudo-scramble tied to progress: stable per frame.
    const pick =
      SCRAMBLE_CHARS[Math.floor(v * (SCRAMBLE_CHARS.length - 1))] ?? char;
    return v > 0.5 ? char.toLowerCase() : pick;
  });
  return <motion.span>{display}</motion.span>;
}

function Closer({ progress }: { progress: MotionValue<number> }) {
  const t = useSegment(progress, 0.74, 0.92);
  const opacity = useTransform(t, [0, 1], [0, 1]);
  const y = useTransform(t, [0, 1], [24, 0]);
  return (
    <motion.p
      style={{ opacity, y }}
      className="mt-8 font-heading text-2xl font-medium leading-snug text-gray-500 md:text-5xl"
    >
      Begini cara penanganan yang ideal.
    </motion.p>
  );
}

export default function Statement() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  return (
    // Pinned stage: 300vh of scroll drives 0 → 1 progress, then releases.
    <section ref={sectionRef} className="relative h-[300vh]">
      <div className="sticky top-0 flex h-screen flex-col items-center justify-center overflow-hidden px-6">
        <div className="flex flex-col items-start">
          <Opener progress={scrollYProgress} />
          <div className="mt-8 flex flex-wrap items-center justify-start gap-3">
            <BlurPill
              progress={scrollYProgress}
              icon={Mic}
              label="Responsif"
              bg="bg-blue-50 text-blue-500"
            />
            <ShinePill
              progress={scrollYProgress}
              icon={ShieldCheck}
              label="Privasi"
              bg="bg-tiby-teal-50 text-tiby-teal-600"
            />
            <ScramblePill
              progress={scrollYProgress}
              icon={BadgeCheck}
              label="Valid"
              bg="bg-red-50 text-red-500"
            />
          </div>
          <Closer progress={scrollYProgress} />
        </div>
      </div>
    </section>
  );
}
