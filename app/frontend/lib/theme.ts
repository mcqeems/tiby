export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "tiby-theme";
const INTERNAL_PATH = /^\/(admin|nakes|pmo|pasien|dashboard)(\/|$)/;

const listeners = new Set<() => void>();

/** The theme is scoped to the signed-in app; public pages stay light. */
export function isInternalPath(pathname: string): boolean {
  return INTERNAL_PATH.test(pathname);
}

export function readTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "dark" || stored === "system" ? stored : "light";
  } catch {
    return "light";
  }
}

export function resolveIsDark(mode: ThemeMode): boolean {
  return (
    mode === "dark" ||
    (mode === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
  );
}

export function applyThemeClass(dark: boolean): void {
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
}

export function applyTheme(mode: ThemeMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* Private mode: keep the in-memory choice for this page. */
  }
  applyThemeClass(resolveIsDark(mode) && isInternalPath(location.pathname));
  listeners.forEach((listener) => listener());
}

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener);

  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * Runs before paint so a stored dark preference never flashes light.
 * Default light; system only applies when the user picked it.
 * Public routes never get the class.
 */
export const THEME_SCRIPT = `(function(){try{var m=localStorage.getItem("tiby-theme")||"light";var internal=/^\\/(admin|nakes|pmo|pasien|dashboard)(\\/|$)/.test(location.pathname);var dark=internal&&(m==="dark"||(m==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches));var e=document.documentElement;e.classList.toggle("dark",dark);e.style.colorScheme=dark?"dark":"light";}catch(e){}})();`;
