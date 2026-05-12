"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  THEME_ATTRIBUTE,
  THEME_STORAGE_KEY,
  darkTheme,
  lightTheme,
  type ResolvedThemeMode,
  type Theme,
  type ThemeMode,
} from "./tokens";

interface ThemeContextValue {
  /** The user's preference — exactly what's in localStorage. */
  mode: ThemeMode;
  /** What's actually rendered now: `light` or `dark`. Never `system`. */
  resolvedMode: ResolvedThemeMode;
  /** The active token object — `lightTheme` or `darkTheme`. */
  theme: Theme;
  setMode: (mode: ThemeMode) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredMode(): ThemeMode {
  if (typeof window === "undefined") return "system";
  const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (raw === "light" || raw === "dark" || raw === "system") return raw;
  return "system";
}

function resolveSystemMode(): ResolvedThemeMode {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // We start with `system` on the server to match the SSR-injected
  // flash-prevention script (`flash-prevention.tsx`). The client reads
  // localStorage in the first effect.
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [resolvedMode, setResolvedMode] = useState<ResolvedThemeMode>("light");

  // Hydrate from localStorage + media query on mount
  useEffect(() => {
    const stored = readStoredMode();
    setModeState(stored);
    setResolvedMode(stored === "system" ? resolveSystemMode() : stored);
  }, []);

  // React to OS-level dark-mode flips when in `system` mode
  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setResolvedMode(mq.matches ? "dark" : "light");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode]);

  // Persist + apply to <html>
  useEffect(() => {
    if (typeof window === "undefined") return;
    document.documentElement.setAttribute(THEME_ATTRIBUTE, resolvedMode);
    document.documentElement.style.colorScheme = resolvedMode;
  }, [resolvedMode]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    }
    setResolvedMode(next === "system" ? resolveSystemMode() : next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      resolvedMode,
      theme: resolvedMode === "dark" ? darkTheme : lightTheme,
      setMode,
    }),
    [mode, resolvedMode, setMode],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
