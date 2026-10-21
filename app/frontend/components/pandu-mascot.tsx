"use client";

import Image from "next/image";
import MascotAnimation from "./mascot-animation";

export type PanduEmotion =
  | "idle"
  | "listening"
  | "thinking"
  | "happy"
  | "empathy"
  | "alert";

interface PanduMascotProps {
  emotion?: PanduEmotion;
  size?: number;
  className?: string;
  altText?: string;
}

const EMOTION_MAP: Record<Exclude<PanduEmotion, "idle">, string> = {
  listening: "/mascot/listening/listening.webp",
  thinking: "/mascot/thinking/thinking.webp",
  happy: "/mascot/happy/happy.webp",
  empathy: "/mascot/empathy/empathy.webp",
  alert: "/mascot/alert/alert.webp",
};

export default function PanduMascot({
  emotion = "idle",
  size = 110,
  className = "",
  altText = "Maskot Pandu Tiby",
}: PanduMascotProps) {
  if (emotion === "idle") {
    return <MascotAnimation size={size} className={className} />;
  }

  const src = EMOTION_MAP[emotion] || EMOTION_MAP.happy;

  return (
    <div
      className={`relative flex items-center justify-center transition-all duration-300 ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Ambient background glow according to emotional state */}
      <div
        className={`absolute rounded-full blur-md pointer-events-none transition-colors duration-300 ${
          emotion === "happy"
            ? "bg-tiby-teal-50/80"
            : emotion === "empathy"
              ? "bg-tiby-cream/80"
              : emotion === "alert"
                ? "bg-red-50/80"
                : "bg-tiby-teal-50/70"
        }`}
        style={{ width: size * 1.05, height: size * 1.05 }}
      />
      <div className="relative z-10 drop-shadow-sm">
        <Image
          src={src}
          alt={altText}
          width={size}
          height={size}
          className="object-contain"
          priority
        />
      </div>
    </div>
  );
}
