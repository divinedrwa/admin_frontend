"use client";

import { useContext } from "react";
import { ThemeContext } from "./ThemeProvider";

/**
 * Read the active theme tokens and the user's mode preference.
 *
 * ```tsx
 * const { theme, mode, resolvedMode, setMode } = useTheme();
 * <div style={{ color: theme.state.approved.fg }} />
 * setMode("dark");
 * ```
 *
 * Throws if used outside a `<ThemeProvider>` — that's a programming
 * error, not a runtime branch worth handling silently.
 */
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error(
      "useTheme() must be used inside <ThemeProvider>. " +
        "Wrap your app in <ThemeProvider> at the root layout.",
    );
  }
  return ctx;
}
