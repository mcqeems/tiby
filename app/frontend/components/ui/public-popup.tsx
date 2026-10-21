"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

export type PopupVariant = "success" | "danger" | "warning" | "info";

export interface PublicPopupProps {
  open: boolean;
  variant?: PopupVariant;
  badgeText?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  hideCancel?: boolean;
  loading?: boolean;
  onConfirm?: () => void;
  onClose: () => void;
}

const VARIANT_CONFIG: Record<
  PopupVariant,
  {
    mascotPath: string;
    badgeBg: string;
    badgeText: string;
    defaultBadge: string;
    confirmBtn: string;
    glowColor: string;
  }
> = {
  success: {
    mascotPath: "/mascot/happy/happy-stroke.png",
    badgeBg: "bg-tiby-teal-50 border-tiby-teal-100",
    badgeText: "text-tiby-teal-700",
    defaultBadge: "Berhasil",
    confirmBtn: "bg-tiby-teal-600 hover:bg-tiby-teal-700 text-white",
    glowColor: "from-tiby-teal-500/20 to-transparent",
  },
  danger: {
    mascotPath: "/mascot/alert/alert.png",
    badgeBg: "bg-red-50 border-red-100",
    badgeText: "text-red-700",
    defaultBadge: "Konfirmasi Tindakan",
    confirmBtn: "bg-red-600 hover:bg-red-700 text-white",
    glowColor: "from-red-500/20 to-transparent",
  },
  warning: {
    mascotPath: "/mascot/idle/idle.png",
    badgeBg: "bg-amber-50 border-amber-200",
    badgeText: "text-amber-800",
    defaultBadge: "Perhatian",
    confirmBtn: "bg-amber-500 hover:bg-amber-600 text-white",
    glowColor: "from-amber-500/20 to-transparent",
  },
  info: {
    mascotPath: "/mascot/empathy/empathy.png",
    badgeBg: "bg-tiby-teal-50 border-tiby-teal-100",
    badgeText: "text-tiby-teal-700",
    defaultBadge: "Informasi Tiby",
    confirmBtn: "bg-tiby-teal-600 hover:bg-tiby-teal-700 text-white",
    glowColor: "from-tiby-teal-500/20 to-transparent",
  },
};

export default function PublicPopup({
  open,
  variant = "info",
  badgeText,
  title,
  description,
  children,
  confirmLabel = "Mengerti",
  cancelLabel = "Batal",
  hideCancel = false,
  loading = false,
  onConfirm,
  onClose,
}: PublicPopupProps) {
  const cfg = VARIANT_CONFIG[variant] || VARIANT_CONFIG.info;

  // Melacak varian aktif sebelumnya untuk mereset error fallback gambar secara murni saat render (tanpa effect setState)
  const [prevVariant, setPrevVariant] = useState(variant);
  const [useFallback, setUseFallback] = useState(false);

  if (variant !== prevVariant) {
    setPrevVariant(variant);
    setUseFallback(false);
  }

  // Hanya effect untuk tombol Escape keyboard
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, loading, onClose]);

  if (!open) return null;

  const currentMascotPath = useFallback ? "/mascot/pandu.png" : cfg.mascotPath;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tiby-popup-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs p-3 sm:p-4 animate-fadeIn"
      onClick={() => {
        if (!loading) onClose();
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-tiby-teal-100 bg-white p-6 sm:p-7 shadow-[0_20px_60px_rgba(15,41,38,0.16)] transition-all duration-200 scale-100"
      >
        {/* Tombol Tutup Pojok Kanan Atas */}
        <button
          type="button"
          disabled={loading}
          onClick={onClose}
          aria-label="Tutup pop up"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-transparent text-tiby-muted hover:border-tiby-teal-100 hover:bg-tiby-teal-50/50 hover:text-tiby-ink transition cursor-pointer disabled:opacity-40 z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Maskot Tanpa Card dengan Efek Gerakan Floating & Glow Halus */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-2 flex items-center justify-center pt-2">
            <div
              className={`absolute inset-0 rounded-full bg-radial ${cfg.glowColor} blur-xl scale-125 pointer-events-none`}
            />

            <img
              src={currentMascotPath}
              alt="Maskot Pandu Tiby"
              onError={() => {
                if (!useFallback) {
                  setUseFallback(true);
                }
              }}
              className="relative h-24 w-24 object-contain drop-shadow-md animate-[bounce_3s_ease-in-out_infinite]"
            />
          </div>

          {/* Pill Badge Kecil */}
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider mb-2 ${cfg.badgeBg} ${cfg.badgeText}`}
          >
            {badgeText || cfg.defaultBadge}
          </span>

          {/* Judul & Deskripsi */}
          <h3
            id="tiby-popup-title"
            className="font-heading text-lg sm:text-xl font-600 text-tiby-ink leading-snug"
          >
            {title}
          </h3>

          {description && (
            <p className="mt-1.5 text-xs sm:text-sm text-tiby-muted leading-relaxed max-w-sm">
              {description}
            </p>
          )}
        </div>

        {/* Custom Slot */}
        {children && <div className="mt-4">{children}</div>}

        {/* Tombol Aksi Responsif */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row items-center justify-center gap-2.5">
          {!hideCancel && (
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="w-full sm:flex-1 rounded-full border border-tiby-teal-100 bg-white px-5 py-2.5 text-xs font-semibold text-tiby-muted hover:bg-gray-50 hover:text-tiby-ink transition cursor-pointer disabled:opacity-50"
            >
              {cancelLabel}
            </button>
          )}

          <button
            type="button"
            disabled={loading}
            onClick={() => {
              if (onConfirm) {
                onConfirm();
              } else {
                onClose();
              }
            }}
            className={`w-full sm:flex-1 rounded-full px-5 py-2.5 text-xs font-semibold shadow-sm transition cursor-pointer disabled:opacity-50 ${cfg.confirmBtn}`}
          >
            {loading ? "Memproses..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
