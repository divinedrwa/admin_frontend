"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import {
  THEME_ATTRIBUTE,
  lightTheme,
  type Theme,
  type ThemeMode,
  type ResolvedThemeMode,
} from "./tokens";
import { api } from "@/lib/api";
import {
  DEFAULT_THEME_COLORS,
  mergeThemeColors,
  resolveSidebarVia,
} from "./defaultThemeColors";

export { mergeThemeColors, normalizeThemeColors } from "./defaultThemeColors";

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

/** CSS variables we override when applying society theme colors. */
const OVERRIDABLE_CSS_VARS = [
  "--gp-brand-primary",
  "--gp-brand-primary-hover",
  "--gp-brand-primary-light",
  "--gp-brand-secondary",
  "--gp-brand-accent",
  "--gp-brand-gradient-start",
  "--gp-brand-gradient-middle",
  "--gp-brand-gradient-end",
  "--gp-brand-danger",
  "--gp-text-primary",
  "--gp-text-secondary",
  "--gp-text-tertiary",
  "--gp-text-inverse",
  "--gp-surface-background",
  "--gp-surface-default",
  "--gp-surface-elevated",
  "--gp-surface-border",
  "--gp-sidebar-from",
  "--gp-sidebar-via",
  "--gp-sidebar-to",
  "--gp-sidebar-active-bg",
  "--gp-state-pending-solid",
  "--gp-state-denied-solid",
  "--gp-state-approved-solid",
  "--gp-state-info-solid",
] as const;

/**
 * Maps themeColors keys → CSS variable names (sidebar handled separately).
 *
 * The themeColors object is shared with the Flutter app, which has a richer set of
 * slots (separate primary/secondary button bg+text, input-field text, Material
 * "container" tint) than the web admin. Each web CSS var must have exactly ONE owner
 * here — `applyThemeColors` iterates in object order and the last writer wins, so two
 * keys pointing at the same var silently disable the first picker. The mobile-only keys
 * below (buttonBg, secondaryButtonBg, secondaryButtonText, primaryContainer, fieldText)
 * are intentionally NOT mapped to web vars; they still reach the Flutter app via the raw
 * themeColors payload. On web, buttons/inverse-text follow the semantic brand/heading
 * keys (primaryColor, secondaryColor, buttonText, headingColor, primaryLight).
 */
const THEME_COLOR_MAP: Record<string, string[]> = {
  primaryColor: ["--gp-brand-primary", "--gp-state-info-solid"],
  primaryHover: ["--gp-brand-primary-hover"],
  primaryLight: ["--gp-brand-primary-light"],
  secondaryColor: ["--gp-brand-secondary"],
  accentColor: ["--gp-brand-accent", "--gp-state-approved-solid"],
  gradientStart: ["--gp-brand-gradient-start"],
  gradientMiddle: ["--gp-brand-gradient-middle"],
  gradientEnd: ["--gp-brand-gradient-end"],
  buttonText: ["--gp-text-inverse"],
  headingColor: ["--gp-text-primary"],
  bodyTextColor: ["--gp-text-secondary"],
  mutedTextColor: ["--gp-text-tertiary"],
  backgroundColor: ["--gp-surface-background"],
  cardColor: ["--gp-surface-default"],
  fieldBg: ["--gp-surface-elevated"],
  sidebarActiveColor: ["--gp-sidebar-active-bg"],
  borderColor: ["--gp-surface-border"],
  warningColor: ["--gp-state-pending-solid"],
  errorColor: ["--gp-brand-danger", "--gp-state-denied-solid"],
};

/** Mid-tone stop for the sidebar gradient (`--gp-sidebar-via`). */
function sidebarViaStop(sidebarBg: string): string {
  return resolveSidebarVia(sidebarBg);
}

/** Remove inline society overrides so `theme-vars.css` defaults show through. */
export function clearThemeColorOverrides(): void {
  if (typeof window === "undefined") return;
  const root = document.documentElement;
  for (const cssVar of OVERRIDABLE_CSS_VARS) {
    root.style.removeProperty(cssVar);
  }
}

/**
 * Applies society theme colors to CSS custom properties on `:root`.
 * Pass `null` to clear overrides and restore compiled CSS defaults.
 */
export function applyThemeColors(
  themeColors: Record<string, string> | null,
): void {
  if (typeof window === "undefined") return;

  clearThemeColorOverrides();
  if (!themeColors) return;

  const merged = mergeThemeColors(themeColors);
  const root = document.documentElement;

  for (const [key, value] of Object.entries(merged)) {
    if (!value || key === "sidebarBg") continue;
    const vars = THEME_COLOR_MAP[key];
    if (!vars) continue;
    for (const cssVar of vars) {
      root.style.setProperty(cssVar, value);
    }
  }

  if (merged.sidebarBg) {
    root.style.setProperty("--gp-sidebar-from", merged.sidebarBg);
    root.style.setProperty("--gp-sidebar-via", sidebarViaStop(merged.sidebarBg));
    root.style.setProperty("--gp-sidebar-to", merged.sidebarBg);
  }
  if (merged.sidebarActiveColor) {
    root.style.setProperty("--gp-sidebar-active-bg", merged.sidebarActiveColor);
  }
}

/** Load society theme from API when a tenant session exists. */
export async function refreshSocietyTheme(): Promise<void> {
  if (typeof window === "undefined") return;
  const token = localStorage.getItem("token");
  if (!token) {
    clearThemeColorOverrides();
    return;
  }

  try {
    const { data } = await api.get("/society-settings");
    const themeColors = data?.society?.themeColors as
      | Record<string, string>
      | null
      | undefined;
    applyThemeColors(themeColors ?? null);
  } catch {
    // Public pages, expired session, or transient API errors — keep CSS defaults.
  }
}

/** Dark mode is disabled for now — always light. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Force light theme on <html>
  useEffect(() => {
    if (typeof window === "undefined") return;
    document.documentElement.setAttribute(THEME_ATTRIBUTE, "light");
    document.documentElement.style.colorScheme = "light";
  }, []);

  // Re-fetch when auth context changes (login → dashboard, logout → login).
  useEffect(() => {
    void refreshSocietyTheme();
  }, [pathname]);

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
