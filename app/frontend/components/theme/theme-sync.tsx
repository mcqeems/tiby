"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  applyThemeClass,
  isInternalPath,
  readTheme,
  resolveIsDark,
  subscribeTheme,
} from "@/lib/theme";

/**
 * Keeps the root class in sync with the stored preference, OS theme changes
 * (when mode is "system") and client-side route changes. Public pages are
 * forced back to light.
 */
export default function ThemeSync() {
  const pathname = usePathname();

  useEffect(() => {
    const sync = () => {
      applyThemeClass(
        isInternalPath(pathname) && resolveIsDark(readTheme()),
      );
    };

    sync();

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", sync);
    const unsubscribe = subscribeTheme(sync);

    return () => {
      media.removeEventListener("change", sync);
      unsubscribe();
    };
  }, [pathname]);

  return null;
}
