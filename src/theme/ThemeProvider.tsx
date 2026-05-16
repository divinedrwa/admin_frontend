"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import {
  THEME_ATTRIBUTE,
  lightTheme,
  type Theme,
  type ThemeMode,
  type ResolvedThemeMode,
} from "./tokens";

interface ThemeContextValue {
  /** The user's preference — exactly what's in localStorage. */
  mode: ThemeMode;
  /** What's actually rendered now: always `light` for now. */
  resolvedMode: ResolvedThemeMode;
  /** The active token object — always `lightTheme` for now. */
  theme: Theme;
  setMode: (mode: ThemeMode) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Dark mode is disabled for now — always light. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  // Force light theme on <html>
  useEffect(() => {
    if (typeof window === "undefined") return;
    document.documentElement.setAttribute(THEME_ATTRIBUTE, "light");
    document.documentElement.style.colorScheme = "light";
  }, []);

  const setMode = useCallback((_next: ThemeMode) => {
    // no-op — dark mode disabled
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode: "light",
      resolvedMode: "light",
      theme: lightTheme,
      setMode,
    }),
    [setMode],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
