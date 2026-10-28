"use client";

import { motion } from "motion/react";
import { AlertCircle, Info, type LucideIcon } from "lucide-react";
import { banner } from "@/lib/motion";

/**
 * Inline failure or info notice. Screens used to hand-roll a red box each
 * time; they now share one shape that slides in and out with the `banner`
 * variant instead of appearing instantly.
 */
export default function ErrorNotice({
  children,
  tone = "error",
  icon,
  className = "",
}: {
  children: React.ReactNode;
  tone?: "error" | "info";
  /** Overrides the default icon for the tone. */
  icon?: LucideIcon;
  className?: string;
}) {
  const Icon = icon ?? (tone === "error" ? AlertCircle : Info);
  const toneClass =
    tone === "error"
      ? "border-red-100 bg-red-50 text-red-700"
      : "border-tiby-teal-100 bg-tiby-teal-50 text-tiby-teal-700";

  return (
    <motion.div
      variants={banner}
      initial="hidden"
      animate="visible"
      className={`flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-xs ${toneClass} ${className}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">{children}</div>
    </motion.div>
  );
}
