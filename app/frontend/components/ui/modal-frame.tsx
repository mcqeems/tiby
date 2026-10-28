"use client";

import { useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { overlay, popIn } from "@/lib/motion";
import { useModalA11y } from "@/lib/use-modal-a11y";

const DEFAULT_OVERLAY =
  "fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm";

/**
 * Shared modal shell: backdrop plus a centered card, both animating in and
 * out with the same variants, and both announcing themselves as a dialog
 * with a focus trap, Escape handling and a reference-counted scroll lock.
 *
 * `open` drives presence, so a component that used to `return null` when
 * closed now returns the frame and lets AnimatePresence play the exit.
 */
export function ModalFrame({
  open,
  onClose,
  label,
  closeOnEscape = true,
  dismissOnBackdrop = true,
  className = DEFAULT_OVERLAY,
  children,
}: {
  open: boolean;
  /** Escape (and the backdrop, unless disabled). Omit for gates that must be
   * dismissed deliberately, such as the consent modal. */
  onClose?: () => void;
  /** Accessible name; prefer it over relying on the visible heading. */
  label?: string;
  closeOnEscape?: boolean;
  /** Set false when the design dismisses through a visible button only. */
  dismissOnBackdrop?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useModalA11y({
    active: open,
    containerRef: overlayRef,
    onClose,
    closeOnEscape,
  });

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={overlayRef}
          role="dialog"
          aria-modal="true"
          aria-label={label}
          variants={overlay}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={dismissOnBackdrop ? onClose : undefined}
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
  label,
  dismissOnBackdrop = true,
  className = DEFAULT_OVERLAY,
  children,
}: {
  /** Escape (and the backdrop, unless disabled). */
  onClose?: () => void;
  label?: string;
  /** Set false when the design dismisses through a visible button only. */
  dismissOnBackdrop?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Mounted only while present, so the dialog is always "active" here.
  useModalA11y({ active: true, containerRef: overlayRef, onClose });

  return (
    <motion.div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      variants={overlay}
      initial="hidden"
      animate="visible"
      exit="exit"
      onClick={dismissOnBackdrop ? onClose : undefined}
      className={className}
    >
      {children}
    </motion.div>
  );
}
