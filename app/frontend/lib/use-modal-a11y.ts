"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modals that are currently mounted, oldest first. Only the newest one
 * reacts to Escape, so a modal opened on top of another closes alone
 * instead of taking its parent with it.
 */
const openModals: HTMLElement[] = [];

/**
 * Body scroll locks are reference counted: closing a nested modal restores
 * scrolling only when the outermost one closes too.
 */
let scrollLocks = 0;

/**
 * Everything a modal needs to be usable without a mouse: focus trap,
 * Escape handling, scroll lock, initial focus, and focus restore on close.
 *
 * The container is the modal root (its backdrop or panel); the trap walks
 * whatever is focusable inside it, which is the card either way.
 */
export function useModalA11y({
  active,
  containerRef,
  onClose,
  closeOnEscape = true,
}: {
  active: boolean;
  containerRef: RefObject<HTMLElement | null>;
  onClose?: () => void;
  /** Set false for gates that must be dismissed deliberately (e.g. consent). */
  closeOnEscape?: boolean;
}) {
  // Keep the latest callback without re-running the effect (and without
  // stealing focus back) on every parent render.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!active) return;

    const container = containerRef.current;
    const previousFocus = document.activeElement as HTMLElement | null;

    if (container) openModals.push(container);
    if (scrollLocks++ === 0) document.body.style.overflow = "hidden";

    const timer = window.setTimeout(() => {
      container?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      // A nested modal owns the keyboard while it is on top.
      if (container && openModals[openModals.length - 1] !== container) return;

      if (event.key === "Escape" && closeOnEscape) {
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }
      if (event.key !== "Tab" || !container) return;

      const nodes = container.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      window.clearTimeout(timer);

      const index = container ? openModals.lastIndexOf(container) : -1;
      if (index >= 0) openModals.splice(index, 1);
      if (--scrollLocks <= 0) {
        scrollLocks = 0;
        document.body.style.overflow = "";
      }

      previousFocus?.focus?.();
    };
  }, [active, closeOnEscape, containerRef]);
}
