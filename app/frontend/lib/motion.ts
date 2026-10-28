import type { Transition, Variants } from "motion/react";

/**
 * Single source of truth for UI motion.
 *
 * Every component pulls its easing, duration and enter/exit variants from
 * here so repeated elements (modals, popovers, cards, list items) move the
 * same way. Anything genuinely one-off (confetti, waveform pulses, the hero
 * image mask) keeps its own configuration on purpose.
 */

export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];
export const EASE_IN_OUT: [number, number, number, number] = [0.4, 0, 0.2, 1];
/** Slight overshoot, used by popups and cards that "land". */
export const EASE_POP: [number, number, number, number] = [0.34, 1.56, 0.64, 1];

export const DUR = {
  /** Overlays, backdrops, exits. */
  fast: 0.18,
  /** Popovers, dropdowns, cards. */
  base: 0.28,
  /** Full modal cards. */
  pop: 0.4,
  /** Scroll reveals. */
  reveal: 0.8,
} as const;

export const TRANS = {
  fast: { duration: DUR.fast, ease: EASE_IN_OUT },
  base: { duration: DUR.base, ease: EASE_IN_OUT },
  out: { duration: DUR.base, ease: EASE_OUT },
  pop: { duration: DUR.pop, ease: EASE_POP },
  spring: { type: "spring", stiffness: 320, damping: 26, mass: 0.9 },
  reveal: { duration: DUR.reveal, ease: EASE_OUT },
} satisfies Record<string, Transition>;

/** Backdrop / scrim. */
export const overlay: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: TRANS.fast },
  exit: { opacity: 0, transition: TRANS.fast },
};

/** Plain crossfade, for content swaps. */
export const fade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: TRANS.fast },
  exit: { opacity: 0, transition: TRANS.fast },
};

/** Content entering from below; the default for step and page changes. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: TRANS.out },
  exit: { opacity: 0, y: 12, transition: TRANS.fast },
};

/** Dropdowns and notification panels, anchored under their trigger. */
export const popover: Variants = {
  hidden: { opacity: 0, y: -8, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: TRANS.out },
  exit: { opacity: 0, y: -6, scale: 0.97, transition: TRANS.fast },
};

/** Centered modal card. */
export const popIn: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1, transition: TRANS.pop },
  exit: { opacity: 0, y: 8, scale: 0.97, transition: TRANS.fast },
};

/** Bottom sheet on small screens. */
export const sheetUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: TRANS.out },
  exit: { opacity: 0, y: 24, transition: TRANS.fast },
};

/** Staggered child. Pair with `staggerParent()`. */
export const listItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: TRANS.out },
};

/** In-flow banners and notices: drop in from just above, leave the same way. */
export const banner: Variants = {
  hidden: { opacity: 0, y: -8 },
  visible: { opacity: 1, y: 0, transition: TRANS.out },
  exit: { opacity: 0, y: -8, transition: TRANS.fast },
};

/**
 * Parent that sequences its children. Motion owns the timing, so children
 * never hand-roll `delay: i * n`.
 */
export function staggerParent(stagger = 0.06, delayChildren = 0): Variants {
  return {
    hidden: {},
    visible: { transition: { staggerChildren: stagger, delayChildren } },
  };
}

/** Danger confirmation nudge; sits on a separate element from `popIn`. */
export const shake: Variants = {
  visible: {
    x: [0, -8, 8, -6, 6, 0],
    transition: { duration: 0.45, delay: 0.35, ease: EASE_IN_OUT },
  },
};

export const VIEWPORT = { once: true, margin: "-80px" };
