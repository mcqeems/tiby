"use client";

import { createContext, useContext, useState, useCallback } from "react";
import PublicPopup, { type PopupVariant } from "./public-popup";

interface PopupOptions {
  variant?: PopupVariant;
  badgeText?: string;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface PopupContextValue {
  notify: (options: PopupOptions) => Promise<void>;
  confirm: (options: PopupOptions) => Promise<boolean>;
}

const PopupContext = createContext<PopupContextValue | null>(null);

export function PopupProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{
    open: boolean;
    mode: "notify" | "confirm";
    options: PopupOptions;
    resolve?: (val: boolean) => void;
  }>({
    open: false,
    mode: "notify",
    options: { title: "" },
  });

  const notify = useCallback((options: PopupOptions): Promise<void> => {
    return new Promise((resolve) => {
      setState({
        open: true,
        mode: "notify",
        options: {
          variant: "info",
          confirmLabel: "Oke, Mengerti",
          ...options,
        },
        resolve: () => resolve(),
      });
    });
  }, []);

  const confirm = useCallback((options: PopupOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        open: true,
        mode: "confirm",
        options: {
          variant: "danger",
          confirmLabel: "Ya, Lanjutkan",
          cancelLabel: "Batal",
          ...options,
        },
        resolve,
      });
    });
  }, []);

  const handleClose = () => {
    const res = state.resolve;
    setState((prev) => ({ ...prev, open: false }));
    if (res) res(false);
  };

  const handleConfirm = () => {
    const res = state.resolve;
    setState((prev) => ({ ...prev, open: false }));
    if (res) res(true);
  };

  return (
    <PopupContext.Provider value={{ notify, confirm }}>
      {children}
      <PublicPopup
        open={state.open}
        variant={state.options.variant}
        badgeText={state.options.badgeText}
        title={state.options.title}
        description={state.options.description}
        confirmLabel={state.options.confirmLabel}
        cancelLabel={state.options.cancelLabel}
        hideCancel={state.mode === "notify"}
        onConfirm={handleConfirm}
        onClose={handleClose}
      />
    </PopupContext.Provider>
  );
}

export function usePopup() {
  const ctx = useContext(PopupContext);
  if (!ctx) {
    throw new Error("usePopup harus digunakan di dalam <PopupProvider>");
  }
  return ctx;
}
