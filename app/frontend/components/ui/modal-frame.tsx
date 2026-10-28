"use client";

import { AnimatePresence, motion } from "motion/react";
import { overlay, popIn } from "@/lib/motion";

/**
 * Shared modal shell: backdrop plus a centered card, both animating in and
 * out with the same variants. Replaces the hand-written
 * `fixed inset-0 bg-black/40` + card pair and the dead `animate-in` classes
 * that used to sit on them.
 *
 * `open` drives presence, so a component that used to `return null` when
 * closed now returns the frame and lets AnimatePresence play the exit.
 */
export function ModalFrame({
  open,
  onClose,
  className = "fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm",
  children,
}: {
  open: boolean;
  /** Backdrop click. Omit for modals that must be dismissed explicitly. */
  onClose?: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          variants={overlay}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={onClose}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** The card inside a ModalFrame. Swallows backdrop clicks and pops in. */
export function ModalCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      variants={popIn}
      initial="hidden"
      animate="visible"
      exit="exit"
      onClick={(event) => event.stopPropagation()}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Backdrop for modals whose *parent* owns presence: the parent wraps the
 * conditional render in its own `AnimatePresence`, so the component keeps
 * unmounting like before and AnimatePresence plays the exit.
 */
export function ModalOverlay({
  onClose,
  className = "fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm",
  children,
}: {
  onClose?: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      variants={overlay}
      initial="hidden"
      animate="visible"
      exit="exit"
      onClick={onClose}
      className={className}
    >
      {children}
    </motion.div>
  );
}
