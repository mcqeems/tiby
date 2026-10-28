"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  applyTheme,
  readTheme,
  subscribeTheme,
  type ThemeMode,
} from "@/lib/theme";

const OPTIONS: { value: ThemeMode; label: string; hint: string; icon: LucideIcon }[] =
  [
    { value: "light", label: "Terang", hint: "Selalu terang", icon: Sun },
    { value: "dark", label: "Gelap", hint: "Selalu gelap", icon: Moon },
    { value: "system", label: "Sistem", hint: "Ikuti perangkat", icon: Monitor },
  ];

export function useThemeMode(): ThemeMode {
  return useSyncExternalStore(subscribeTheme, readTheme, () => "light");
}

interface ThemeToggleProps {
  variant?: "dialog" | "sidebar";
  collapsed?: boolean;
}

export default function ThemeToggle({
  variant = "dialog",
  collapsed = false,
}: ThemeToggleProps) {
  const mode = useThemeMode();

  if (variant === "sidebar") {
    return (
      <div
        role="group"
        aria-label="Mode tampilan"
        className={collapsed ? "space-y-1" : "space-y-1.5"}
      >
        {!collapsed && (
          <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-tiby-muted">
            Tampilan
          </p>
        )}
        <div
          className={
            collapsed
              ? "flex flex-col items-center gap-1"
              : "flex items-center gap-1 rounded-xl border border-tiby-teal-100 bg-tiby-white p-1"
          }
        >
          {OPTIONS.map(({ value, label, icon: Icon }) => {
            const selected = mode === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => applyTheme(value)}
                title={`Mode ${label}`}
                aria-label={`Mode ${label}`}
                aria-pressed={selected}
                className={`flex h-8 items-center justify-center rounded-lg transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tiby-teal-600 ${
                  collapsed ? "w-8" : "flex-1"
                } ${
                  selected
                    ? "bg-tiby-teal-600 text-white shadow-sm"
                    : "text-tiby-muted hover:bg-tiby-teal-50 hover:text-tiby-teal-700"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label="Mode tampilan"
      className="grid gap-3 sm:grid-cols-3"
    >
      {OPTIONS.map(({ value, label, hint, icon: Icon }) => {
        const selected = mode === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => applyTheme(value)}
            aria-pressed={selected}
            className={`flex flex-col items-start gap-1.5 rounded-xl border p-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tiby-teal-600 ${
              selected
                ? "border-tiby-teal-600 bg-tiby-teal-50 text-tiby-teal-700 ring-1 ring-tiby-teal-600"
                : "border-gray-200 bg-white text-tiby-ink hover:border-tiby-teal-200 hover:bg-gray-50"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="text-sm font-semibold">{label}</span>
            <span className="text-[11px] text-tiby-muted">{hint}</span>
          </button>
        );
      })}
    </div>
  );
}
