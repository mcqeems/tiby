"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { CheckCircle2, AlertTriangle, ShieldAlert, Flame } from "lucide-react";

interface CheckInResultProps {
  verdict: string;
  message: string;
  streak: number;
}

const cssVars = (vars: Record<string, string | number>) =>
  vars as React.CSSProperties;

/** Confetti deterministik (aman dari hydration mismatch). */
const CONFETTI_COLORS = [
  "bg-emerald-400",
  "bg-tiby-teal-500",
  "bg-amber-400",
  "bg-orange-400",
  "bg-tiby-teal-100",
];
const CONFETTI = Array.from({ length: 22 }, (_, i) => {
  const angle = (i / 22) * Math.PI * 2 + (i % 2) * 0.15;
  const dist = i % 3 === 0 ? 150 : i % 3 === 1 ? 110 : 130;
  return {
    tx: Math.round(Math.cos(angle) * dist),
    ty: Math.round(Math.sin(angle) * dist * 0.9),
    rot: (i % 2 === 0 ? 1 : -1) * (140 + i * 22),
    delay: 280 + (i % 6) * 35,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    round: i % 3 === 0,
  };
});

const CSS = `
@keyframes ci-pop {
  0%   { opacity: 0; transform: scale(.3) rotate(-14deg); }
  60%  { opacity: 1; transform: scale(1.15) rotate(4deg); }
  100% { opacity: 1; transform: scale(1) rotate(0); }
}
@keyframes ci-float {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-8px); }
}
@keyframes ci-sway {
  0%, 100% { transform: rotate(0); }
  25%      { transform: rotate(-6deg); }
  75%      { transform: rotate(6deg); }
}
@keyframes ci-alert-in {
  0%   { opacity: 0; transform: translateY(-36px) scale(1.25); }
  35%  { opacity: 1; transform: translateY(0) scale(1); }
  50%  { transform: translateX(-9px) rotate(-6deg); }
  62%  { transform: translateX(9px) rotate(5deg); }
  74%  { transform: translateX(-5px) rotate(-3deg); }
  86%  { transform: translateX(3px) rotate(2deg); }
  100% { opacity: 1; transform: none; }
}
@keyframes ci-throb {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.05); }
}
.ci-mascot-good {
  animation: ci-pop .7s cubic-bezier(.34,1.56,.64,1) .1s both,
             ci-float 3.4s ease-in-out 1s infinite;
}
.ci-mascot-warn {
  transform-origin: 50% 90%;
  animation: ci-pop .6s cubic-bezier(.34,1.56,.64,1) .1s both,
             ci-sway 2.8s ease-in-out .8s infinite;
}
.ci-mascot-bad {
  animation: ci-alert-in 1s ease-out .1s both,
             ci-throb 2.4s ease-in-out 1.2s infinite;
}

/* Glow & cincin */
@keyframes ci-glow-in {
  0%   { opacity: 0; transform: scale(.7); }
  100% { opacity: 1; transform: scale(1.25); }
}
@keyframes ci-glow-pulse {
  0%, 100% { opacity: .6; transform: scale(1.15); }
  50%      { opacity: 1;  transform: scale(1.45); }
}
.ci-glow-in    { animation: ci-glow-in .9s ease-out .1s both; }
.ci-glow-pulse { animation: ci-glow-pulse 1.8s ease-in-out .1s infinite; }

@keyframes ci-ring {
  0%   { opacity: .7; transform: scale(.65); }
  100% { opacity: 0;  transform: scale(2); }
}
.ci-ring { animation: ci-ring 1.1s ease-out both; }
.ci-ring-loop { animation: ci-ring 1.8s ease-out infinite; }

/* Confetti */
@keyframes ci-confetti {
  0%   { opacity: 1; transform: translate(0,0) scale(0) rotate(0); }
  15%  { opacity: 1; transform: translate(0,0) scale(1) rotate(0); }
  100% { opacity: 0; transform: translate(var(--tx), var(--ty)) scale(.9) rotate(var(--r)); }
}
.ci-confetti {
  animation: ci-confetti 1.1s cubic-bezier(.1,.8,.3,1) both;
  animation-delay: var(--d, 0ms);
}

/* Teks muncul berurutan */
@keyframes ci-rise {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: none; }
}
.ci-rise {
  animation: ci-rise .5s cubic-bezier(.2,.8,.2,1) both;
  animation-delay: var(--d, 0ms);
}

/* Ikon status */
@keyframes ci-icon-in {
  0%   { opacity: 0; transform: scale(0) rotate(-90deg); }
  70%  { opacity: 1; transform: scale(1.25) rotate(8deg); }
  100% { opacity: 1; transform: scale(1) rotate(0); }
}
.ci-icon { animation: ci-icon-in .6s cubic-bezier(.34,1.56,.64,1) .45s both; }

/* Kartu streak */
@keyframes ci-card-in {
  0%   { opacity: 0; transform: translateY(24px) scale(.85); }
  100% { opacity: 1; transform: none; }
}
@keyframes ci-shine {
  0%   { transform: translateX(-120%) skewX(-20deg); }
  100% { transform: translateX(260%) skewX(-20deg); }
}
.ci-streak-card {
  animation: ci-card-in .6s cubic-bezier(.34,1.56,.64,1) .75s both;
}
.ci-shine {
  animation: ci-shine 1.1s ease-in-out 1.5s both;
}

/* Api: menyala lalu berkedip */
@keyframes ci-ignite {
  0%   { opacity: 0; transform: scale(0) rotate(-25deg); }
  60%  { opacity: 1; transform: scale(1.4) rotate(6deg); }
  100% { opacity: 1; transform: scale(1) rotate(0); }
}
@keyframes ci-flicker {
  0%, 100% { transform: scale(1, 1) rotate(-2deg); }
  25%      { transform: scale(1.08, .95) rotate(2deg); }
  50%      { transform: scale(.95, 1.1) rotate(-1deg); }
  75%      { transform: scale(1.05, 1) rotate(3deg); }
}
.ci-flame {
  transform-origin: 50% 90%;
  animation: ci-ignite .7s cubic-bezier(.34,1.56,.64,1) 1s both,
             ci-flicker 1.4s ease-in-out 1.7s infinite;
}
@keyframes ci-flame-halo {
  0%, 100% { opacity: .35; transform: scale(1); }
  50%      { opacity: .7;  transform: scale(1.35); }
}
.ci-flame-halo { animation: ci-flame-halo 1.4s ease-in-out 1.2s infinite; }

/* Angka streak naik saat bertambah */
@keyframes ci-count-bump {
  0%   { transform: scale(1); }
  40%  { transform: scale(1.18); }
  100% { transform: scale(1); }
}
.ci-count-done { animation: ci-count-bump .35s ease-out; }

@media (prefers-reduced-motion: reduce) {
  .ci-root, .ci-root * {
    animation-duration: .01ms !important;
    animation-delay: 0ms !important;
    animation-iteration-count: 1 !important;
  }
}
`;

/** Hitung naik dari 0 ke target. Langsung ke target jika user memilih reduce motion. */
function useCountUp(target: number, delay = 900, duration = 1000) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduce) {
      const id = requestAnimationFrame(() => setValue(target));
      return () => cancelAnimationFrame(id);
    }

    let raf = 0;
    const timer = setTimeout(() => {
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setValue(Math.round(target * eased));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [target, delay, duration]);

  return value;
}

export default function CheckInResult({
  verdict,
  message,
  streak,
}: CheckInResultProps) {
  const isGood = verdict === "TERKENDALI";
  const isWarn = verdict === "PERLU_PERHATIAN";

  const config = isGood
    ? {
        color: "text-emerald-600",
        mascot: "/mascot/happy/happy-stroke.png",
        icon: CheckCircle2,
        title: "Luar Biasa!",
        mascotAnim: "ci-mascot-good",
        glow: "from-emerald-400/30 to-transparent",
        glowAnim: "ci-glow-in",
        ring: "border-emerald-500/50",
        ringAnim: "ci-ring",
        rings: 2,
      }
    : isWarn
      ? {
          color: "text-amber-600",
          mascot: "/mascot/empathy/empathy.png",
          icon: AlertTriangle,
          title: "Perlu Perhatian",
          mascotAnim: "ci-mascot-warn",
          glow: "from-amber-400/30 to-transparent",
          glowAnim: "ci-glow-in",
          ring: "",
          ringAnim: "",
          rings: 0,
        }
      : {
          color: "text-red-600",
          mascot: "/mascot/alert/alert.png",
          icon: ShieldAlert,
          title: "Segera ke Faskes",
          mascotAnim: "ci-mascot-bad",
          glow: "from-red-500/30 to-transparent",
          glowAnim: "ci-glow-pulse",
          ring: "border-red-500/50",
          ringAnim: "ci-ring-loop",
          rings: 2,
        };

  const Icon = config.icon;

  let displayMessage = message;
  if (isGood) {
    displayMessage =
      streak === 1
        ? "Api semangatmu baru saja dinyalakan kembali! Ayo jaga konsistensi minum obatmu besok ya."
        : `Luar biasa! Kamu sudah konsisten selama ${streak} hari. Pertahankan semangatmu!`;
  }

  const count = useCountUp(isGood ? streak : 0);
  const isMilestone = isGood && streak > 1 && streak % 7 === 0;

  return (
    <div className="ci-root flex flex-col items-center justify-center py-6 space-y-6 text-center">
      <style>{CSS}</style>

      {/* Maskot + efek */}
      <div className="relative w-40 h-40">
        <div
          className={`absolute inset-0 rounded-full bg-radial ${config.glow} blur-2xl pointer-events-none ${config.glowAnim}`}
        />

        {Array.from({ length: config.rings }).map((_, i) => (
          <span
            key={i}
            aria-hidden
            style={cssVars({ animationDelay: `${300 + i * 250}ms` })}
            className={`${config.ringAnim} pointer-events-none absolute inset-4 rounded-full border-2 ${config.ring}`}
          />
        ))}

        {isGood &&
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
              className={`ci-confetti pointer-events-none absolute left-1/2 top-1/2 h-2 w-2 ${
                p.round ? "rounded-full" : "rounded-xs"
              } ${p.color}`}
            />
          ))}

        <div className={`relative h-full w-full ${config.mascotAnim}`}>
          <Image
            src={config.mascot}
            alt={config.title}
            fill
            className="object-contain drop-shadow-xl"
            priority
          />
        </div>
      </div>

      {/* Judul & pesan */}
      <div className="space-y-3 px-4">
        <div className="flex items-center justify-center gap-2">
          <Icon className={`ci-icon w-7 h-7 ${config.color}`} />
          <h2
            style={cssVars({ "--d": "380ms" })}
            className={`ci-rise font-heading text-3xl font-bold ${config.color}`}
          >
            {config.title}
          </h2>
        </div>
        <p
          style={cssVars({ "--d": "500ms" })}
          className="ci-rise text-sm text-tiby-muted leading-relaxed max-w-sm mx-auto"
        >
          {displayMessage}
        </p>
      </div>

      {/* Kartu streak */}
      {isGood && (
        <div
          className={`ci-streak-card relative overflow-hidden px-6 py-3 rounded-2xl border shadow-sm flex items-center gap-3 ${
            streak === 1
              ? "bg-amber-50 border-amber-200 text-amber-700"
              : "bg-tiby-teal-50 border-tiby-teal-200 text-tiby-teal-700"
          } ${isMilestone ? "shadow-[0_0_24px_rgba(251,146,60,0.45)]" : ""}`}
        >
          {/* kilau yang lewat sekali */}
          <span
            aria-hidden
            className="ci-shine pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-transparent via-white/70 to-transparent"
          />

          <div className="relative flex h-8 w-8 items-center justify-center">
            <span
              aria-hidden
              className="ci-flame-halo absolute inset-0 rounded-full bg-orange-400/40 blur-md"
            />
            <Flame
              className={`ci-flame relative w-6 h-6 ${
                streak === 1
                  ? "text-amber-500 fill-amber-500"
                  : "text-orange-500 fill-orange-500"
              }`}
            />
          </div>

          <div className="relative text-left">
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">
              {isMilestone ? "Streak Spesial!" : "Streak Kamu"}
            </p>
            <p
              key={count === streak ? "done" : "counting"}
              className={`font-bold text-lg leading-none tabular-nums origin-left ${
                count === streak ? "ci-count-done" : ""
              }`}
            >
              {count} Hari
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
