"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import Image from "next/image";

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

const EXIT_MS = 200;

const VARIANT_CONFIG: Record<
  PopupVariant,
  {
    mascotPath: string;
    badgeBg: string;
    badgeText: string;
    defaultBadge: string;
    confirmBtn: string;
    glowColor: string;
    /** animasi maskot saat masuk + idle */
    mascotAnim: string;
    /** animasi glow di belakang maskot */
    glowAnim: string;
    /** animasi seluruh card (hanya danger yang bergetar) */
    wrapAnim: string;
    /** animasi denyut badge */
    badgeAnim: string;
    /** cincin gelombang di belakang maskot */
    ringClass: string;
    ringCount: number;
    confetti: boolean;
  }
> = {
  success: {
    mascotPath: "/mascot/happy/happy-stroke.png",
    badgeBg: "bg-tiby-teal-50 border-tiby-teal-100",
    badgeText: "text-tiby-teal-700",
    defaultBadge: "Berhasil",
    confirmBtn: "bg-tiby-teal-600 hover:bg-tiby-teal-700 text-white",
    glowColor: "from-tiby-teal-500/20 to-transparent",
    mascotAnim: "tp-mascot-success",
    glowAnim: "tp-glow-soft",
    wrapAnim: "",
    badgeAnim: "",
    ringClass: "border-tiby-teal-500/50",
    ringCount: 2,
    confetti: true,
  },
  danger: {
    mascotPath: "/mascot/alert/alert.png",
    badgeBg: "bg-red-50 border-red-100",
    badgeText: "text-red-700",
    defaultBadge: "Konfirmasi Tindakan",
    confirmBtn: "bg-red-600 hover:bg-red-700 text-white",
    glowColor: "from-red-500/20 to-transparent",
    mascotAnim: "tp-mascot-danger",
    glowAnim: "tp-glow-alert",
    wrapAnim: "tp-wrap-shake",
    badgeAnim: "tp-badge-danger",
    ringClass: "border-red-500/50",
    ringCount: 1,
    confetti: false,
  },
  warning: {
    mascotPath: "/mascot/idle/idle.png",
    badgeBg: "bg-amber-50 border-amber-200",
    badgeText: "text-amber-800",
    defaultBadge: "Perhatian",
    confirmBtn: "bg-amber-500 hover:bg-amber-600 text-white",
    glowColor: "from-amber-500/20 to-transparent",
    mascotAnim: "tp-mascot-warning",
    glowAnim: "tp-glow-soft",
    wrapAnim: "",
    badgeAnim: "tp-badge-warning",
    ringClass: "",
    ringCount: 0,
    confetti: false,
  },
  info: {
    mascotPath: "/mascot/empathy/empathy.png",
    badgeBg: "bg-tiby-teal-50 border-tiby-teal-100",
    badgeText: "text-tiby-teal-700",
    defaultBadge: "Informasi Tiby",
    confirmBtn: "bg-tiby-teal-600 hover:bg-tiby-teal-700 text-white",
    glowColor: "from-tiby-teal-500/20 to-transparent",
    mascotAnim: "tp-mascot-info",
    glowAnim: "tp-glow-soft",
    wrapAnim: "",
    badgeAnim: "",
    ringClass: "",
    ringCount: 0,
    confetti: false,
  },
};


const CONFETTI_COLORS = [
  "bg-tiby-teal-500",
  "bg-amber-400",
  "bg-emerald-300",
  "bg-tiby-teal-100",
];
const CONFETTI = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2;
  const dist = i % 2 === 0 ? 92 : 64;
  return {
    tx: Math.round(Math.cos(angle) * dist),
    ty: Math.round(Math.sin(angle) * dist),
    rot: (i % 2 === 0 ? 1 : -1) * (120 + i * 25),
    delay: 250 + (i % 5) * 30,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    round: i % 3 === 0,
  };
});

/** Helper kecil untuk custom property CSS tanpa error tipe. */
const cssVars = (vars: Record<string, string | number>) =>
  vars as React.CSSProperties;

const POPUP_CSS = `
/* ---------- Overlay & card ---------- */
@keyframes tp-fade { from { opacity: 0 } to { opacity: 1 } }
@keyframes tp-fade-out { to { opacity: 0 } }
@keyframes tp-card-in {
  0%   { opacity: 0; transform: translateY(32px) scale(.92); }
  100% { opacity: 1; transform: none; }
}
@keyframes tp-card-out {
  to { opacity: 0; transform: translateY(12px) scale(.96); }
}
.tp-overlay-in  { animation: tp-fade .25s ease-out both; }
.tp-overlay-out { animation: tp-fade-out ${EXIT_MS}ms ease-in both; }
.tp-card-in  { animation: tp-card-in .5s cubic-bezier(.34,1.56,.64,1) both; }
.tp-card-out { animation: tp-card-out ${EXIT_MS}ms ease-in both; }

/* Getar seluruh card (danger) setelah card selesai masuk */
@keyframes tp-shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-8px); }
  40% { transform: translateX(8px); }
  60% { transform: translateX(-5px); }
  80% { transform: translateX(3px); }
}
.tp-wrap-shake { animation: tp-shake .45s ease-in-out .32s both; }

/* ---------- Konten muncul berurutan ---------- */
@keyframes tp-rise {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: none; }
}
.tp-rise {
  animation: tp-rise .45s cubic-bezier(.2,.8,.2,1) both;
  animation-delay: var(--d, 0ms);
}

/* ---------- Maskot ---------- */
@keyframes tp-pop {
  0%   { opacity: 0; transform: scale(.3) rotate(-14deg); }
  60%  { opacity: 1; transform: scale(1.14) rotate(4deg); }
  100% { opacity: 1; transform: scale(1) rotate(0); }
}
@keyframes tp-pop-soft {
  0%   { opacity: 0; transform: translateY(14px) scale(.9); }
  100% { opacity: 1; transform: none; }
}
@keyframes tp-float {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-6px); }
}
@keyframes tp-alert-in {
  0%   { opacity: 0; transform: translateY(-28px) scale(1.25); }
  35%  { opacity: 1; transform: translateY(0) scale(1); }
  50%  { transform: translateX(-7px) rotate(-6deg); }
  62%  { transform: translateX(7px) rotate(5deg); }
  74%  { transform: translateX(-4px) rotate(-3deg); }
  86%  { transform: translateX(3px) rotate(2deg); }
  100% { opacity: 1; transform: none; }
}
@keyframes tp-throb {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.05); }
}
@keyframes tp-sway {
  0%, 100% { transform: rotate(0); }
  25%      { transform: rotate(-7deg); }
  75%      { transform: rotate(7deg); }
}

/* success: muncul membal, lalu melayang pelan */
.tp-mascot-success {
  animation:
    tp-pop .65s cubic-bezier(.34,1.56,.64,1) .15s both,
    tp-float 3.2s ease-in-out .9s infinite;
}
/* danger: jatuh dari atas lalu bergetar, lalu berdenyut pelan */
.tp-mascot-danger {
  animation:
    tp-alert-in .9s ease-out .1s both,
    tp-throb 2.4s ease-in-out 1.1s infinite;
}
/* warning: membal, lalu miring kiri-kanan seperti memberi peringatan */
.tp-mascot-warning {
  transform-origin: 50% 90%;
  animation:
    tp-pop .5s cubic-bezier(.34,1.56,.64,1) .15s both,
    tp-sway 2.6s ease-in-out .75s infinite;
}
/* info: naik halus, lalu melayang tenang */
.tp-mascot-info {
  animation:
    tp-pop-soft .55s cubic-bezier(.2,.8,.2,1) .1s both,
    tp-float 3.6s ease-in-out .7s infinite;
}

/* ---------- Glow, cincin, confetti ---------- */
@keyframes tp-glow-soft {
  0%   { opacity: 0; transform: scale(.8); }
  40%  { opacity: 1; transform: scale(1.25); }
  100% { opacity: .9; transform: scale(1.3); }
}
@keyframes tp-glow-alert {
  0%, 100% { opacity: .6; transform: scale(1.2); }
  50%      { opacity: 1;  transform: scale(1.5); }
}
.tp-glow-soft  { animation: tp-glow-soft .8s ease-out .1s both; }
.tp-glow-alert { animation: tp-glow-alert 1.8s ease-in-out .1s infinite; }

@keyframes tp-ring {
  0%   { opacity: .7; transform: scale(.7); }
  100% { opacity: 0;  transform: scale(2.1); }
}
.tp-ring { animation: tp-ring 1s ease-out both; }

@keyframes tp-confetti {
  0%   { opacity: 1; transform: translate(0,0) scale(0) rotate(0); }
  15%  { opacity: 1; transform: translate(0,0) scale(1) rotate(0); }
  100% {
    opacity: 0;
    transform: translate(var(--tx), var(--ty)) scale(.9) rotate(var(--r));
  }
}
.tp-confetti {
  animation: tp-confetti .95s cubic-bezier(.1,.8,.3,1) both;
  animation-delay: var(--d, 0ms);
}

/* ---------- Denyut badge ---------- */
@keyframes tp-badge-warning-kf {
  0%, 100% { box-shadow: 0 0 0 0 rgba(245,158,11,.45); }
  60%      { box-shadow: 0 0 0 8px rgba(245,158,11,0); }
}
@keyframes tp-badge-danger-kf {
  0%, 100% { box-shadow: 0 0 0 0 rgba(220,38,38,.35); }
  60%      { box-shadow: 0 0 0 8px rgba(220,38,38,0); }
}
.tp-badge-warning { animation: tp-badge-warning-kf 2s ease-out 1s infinite; }
.tp-badge-danger  { animation: tp-badge-danger-kf 2s ease-out 1.2s infinite; }

/* ---------- Hormati preferensi "kurangi gerakan" ---------- */
@media (prefers-reduced-motion: reduce) {
  .tp-root, .tp-root * {
    animation-duration: .01ms !important;
    animation-delay: 0ms !important;
    animation-iteration-count: 1 !important;
  }
}
`;

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

  const [prevVariant, setPrevVariant] = useState(variant);
  const [useFallback, setUseFallback] = useState(false);
  if (variant !== prevVariant) {
    setPrevVariant(variant);
    setUseFallback(false);
  }

  // `mounted` menahan komponen tetap ada selama animasi keluar berjalan
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);

  useEffect(() => {
    if (open || !mounted) return;
    const t = setTimeout(() => setMounted(false), EXIT_MS);
    return () => clearTimeout(t);
  }, [open, mounted]);

  // Tombol Escape
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, loading, onClose]);

  if (!mounted) return null;

  const closing = !open;
  const currentMascotPath = useFallback ? "/mascot/pandu.png" : cfg.mascotPath;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tiby-popup-title"
      className={`tp-root fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs p-3 sm:p-4 ${
        closing ? "tp-overlay-out pointer-events-none" : "tp-overlay-in"
      }`}
      onClick={() => {
        if (!loading) onClose();
      }}
    >
      <style>{POPUP_CSS}</style>

      {/* Wrapper luar: khusus getaran (danger) agar tidak bentrok dengan animasi masuk card */}
      <div className={`w-full max-w-md ${open ? cfg.wrapAnim : ""}`}>
        <div
          onClick={(e) => e.stopPropagation()}
          className={`relative w-full rounded-3xl border border-tiby-teal-100 bg-white p-6 sm:p-7 shadow-[0_20px_60px_rgba(15,41,38,0.16)] ${
            closing ? "tp-card-out" : "tp-card-in"
          }`}
        >
          {/* Tombol Tutup */}
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            aria-label="Tutup pop up"
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-transparent text-tiby-muted hover:border-tiby-teal-100 hover:bg-tiby-teal-50/50 hover:text-tiby-ink transition cursor-pointer disabled:opacity-40 z-10"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex flex-col items-center text-center">
            {/* Maskot + efek sesuai varian */}
            <div className="relative mb-2 flex items-center justify-center pt-2">
              {/* Glow */}
              <div
                className={`absolute inset-0 rounded-full bg-radial ${cfg.glowColor} blur-xl pointer-events-none ${cfg.glowAnim}`}
              />

              {/* Cincin gelombang (success & danger) */}
              {Array.from({ length: cfg.ringCount }).map((_, i) => (
                <span
                  key={i}
                  aria-hidden
                  style={cssVars({ animationDelay: `${300 + i * 220}ms` })}
                  className={`tp-ring pointer-events-none absolute left-1/2 top-1/2 -ml-12 -mt-10 h-24 w-24 rounded-full border-2 ${cfg.ringClass}`}
                />
              ))}

              {/* Confetti (success) */}
              {cfg.confetti &&
                CONFETTI.map((p, i) => (
                  <span
                    key={i}
                    aria-hidden
                    style={cssVars({
                      "--tx": `${p.tx}px`,
                      "--ty": `${p.ty}px`,
                      "--r": `${p.rot}deg`,
                      "--d": `${p.delay}ms`,
                    })}
                    className={`tp-confetti pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 ${
                      p.round ? "rounded-full" : "rounded-[2px]"
                    } ${p.color}`}
                  />
                ))}

              <Image
                width={96}
                height={96}
                
                src={currentMascotPath}
                alt="Maskot Pandu Tiby"
                onError={() => {
                  if (!useFallback) setUseFallback(true);
                }}
                className={`relative h-24 w-24 object-contain drop-shadow-md ${cfg.mascotAnim}`}
              />
            </div>

            {/* Badge */}
            <span
              style={cssVars({ "--d": "220ms" })}
              className={`tp-rise inline-flex items-center gap-1 rounded-full border px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider mb-2 ${cfg.badgeBg} ${cfg.badgeText} ${cfg.badgeAnim}`}
            >
              {badgeText || cfg.defaultBadge}
            </span>

            <h3
              id="tiby-popup-title"
              style={cssVars({ "--d": "280ms" })}
              className="tp-rise font-heading text-lg sm:text-xl font-600 text-tiby-ink leading-snug"
            >
              {title}
            </h3>

            {description && (
              <p
                style={cssVars({ "--d": "340ms" })}
                className="tp-rise mt-1.5 text-xs sm:text-sm text-tiby-muted leading-relaxed max-w-sm"
              >
                {description}
              </p>
            )}
          </div>

          {/* Custom Slot */}
          {children && (
            <div className="tp-rise mt-4" style={cssVars({ "--d": "380ms" })}>
              {children}
            </div>
          )}

          {/* Tombol Aksi */}
          <div
            style={cssVars({ "--d": "430ms" })}
            className="tp-rise mt-6 flex flex-col-reverse sm:flex-row items-center justify-center gap-2.5"
          >
            {!hideCancel && (
              <button
                type="button"
                disabled={loading}
                onClick={onClose}
                className="w-full sm:flex-1 rounded-full border border-tiby-teal-100 bg-white px-5 py-2.5 text-xs font-semibold text-tiby-muted hover:bg-gray-50 hover:text-tiby-ink active:scale-95 transition cursor-pointer disabled:opacity-50"
              >
                {cancelLabel}
              </button>
            )}

            <button
              type="button"
              disabled={loading}
              onClick={() => {
                if (onConfirm) onConfirm();
                else onClose();
              }}
              className={`w-full sm:flex-1 inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold shadow-sm active:scale-95 transition cursor-pointer disabled:opacity-50 ${cfg.confirmBtn}`}
            >
              {loading && (
                <span
                  aria-hidden
                  className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white"
                />
              )}
              {loading ? "Memproses..." : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
