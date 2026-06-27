/**
 * Canonical society theme defaults — keep in sync with:
 * - `scripts/generate-theme-css.mjs` (web CSS variables)
 * - `divine_app/lib/theme/app_colors.dart` (`AppColorPalette.light`)
 * - `divine_app/lib/core/theme/app_colors_bridge.dart` (`AppColorState.defaults`)
 *
 * Platform default matches the GatePass+ brand identity (navy / blue / green).
 * Societies can pick “Forest Teal” or other templates in Society Settings.
 */

export type ThemeColors = {
  /** Mobile + web: primary brand, buttons, links, active states */
  primaryColor: string;
  /** Pressed / hover state for primary actions */
  primaryHover: string;
  /** Light tint backgrounds (badges, highlights) */
  primaryLight: string;
  /** Container / chip backgrounds */
  primaryContainer: string;
  /** Secondary brand — gradients, secondary buttons */
  secondaryColor: string;
  /** Success / vibrant accent (logo +, approve actions) */
  accentColor: string;
  /** Brand gradient stops (mobile headers, marketing) */
  gradientStart: string;
  gradientMiddle: string;
  gradientEnd: string;
  /** Primary CTA button */
  buttonBg: string;
  buttonText: string;
  secondaryButtonBg: string;
  secondaryButtonText: string;
  /** Page titles, card headings */
  headingColor: string;
  /** Body copy, descriptions */
  bodyTextColor: string;
  /** Hints, captions, disabled labels */
  mutedTextColor: string;
  /** Page / scaffold background */
  backgroundColor: string;
  /** Cards, modals, elevated panels */
  cardColor: string;
  /** Input / search field fill */
  fieldBg: string;
  /** Typed text inside inputs */
  fieldText: string;
  /** Admin web only: left nav gradient base (deep teal) */
  sidebarBg: string;
  /** Admin web only: selected nav item pill */
  sidebarActiveColor: string;
  /** Dividers, card outlines, input borders */
  borderColor: string;
  /** List / toolbar icons */
  iconColor: string;
  /** Icon tile backgrounds */
  iconBg: string;
  /** Pending / warning badges */
  warningColor: string;
  /** Error / danger actions */
  errorColor: string;
};

/**
 * Official GatePass+ brand palette — product identity guide:
 * navy #0D1B3D, royal blue #2563EB, green #16A34A, surfaces #F4F6F8.
 */
export const GP_BRAND_THEME_COLORS: ThemeColors = {
  primaryColor: "#0D1B3D",
  primaryHover: "#091428",
  primaryLight: "#E8ECF4",
  primaryContainer: "#EEF2F8",
  secondaryColor: "#2563EB",
  accentColor: "#16A34A",
  gradientStart: "#070F22",
  gradientMiddle: "#0D1B3D",
  gradientEnd: "#16A34A",
  buttonBg: "#0D1B3D",
  buttonText: "#FFFFFF",
  secondaryButtonBg: "#2563EB",
  secondaryButtonText: "#FFFFFF",
  headingColor: "#0D1B3D",
  bodyTextColor: "#374151",
  mutedTextColor: "#6B7280",
  backgroundColor: "#F4F6F8",
  cardColor: "#FFFFFF",
  fieldBg: "#F4F6F8",
  fieldText: "#0D1B3D",
  sidebarBg: "#0D1B3D",
  sidebarActiveColor: "#16A34A",
  borderColor: "#E2E8F0",
  iconColor: "#64748B",
  iconBg: "#FFFFFF",
  warningColor: "#D97706",
  errorColor: "#DC2626",
};

/** Mid-stop for admin sidebar gradient (GP navy). */
export const GP_SIDEBAR_VIA = "#1A3568";

const FOREST_TEAL_SIDEBAR = "#003D33";
const FOREST_TEAL_SIDEBAR_VIA = "#004D40";

const SIDEBAR_VIA_BY_BG: Record<string, string> = {
  [GP_BRAND_THEME_COLORS.sidebarBg.toUpperCase()]: GP_SIDEBAR_VIA,
  [FOREST_TEAL_SIDEBAR]: FOREST_TEAL_SIDEBAR_VIA,
};

/** Sidebar gradient mid-stop for previews and runtime theme apply. */
export function resolveSidebarVia(sidebarBg: string): string {
  const key = sidebarBg.trim().toUpperCase();
  return SIDEBAR_VIA_BY_BG[key] ?? sidebarBg;
}

/** GatePass+ brand — platform default when society has no custom theme. */
export const DEFAULT_THEME_COLORS: ThemeColors = {
  ...GP_BRAND_THEME_COLORS,
};

/** Mid-tone stop for the sidebar gradient (`--gp-sidebar-via`). */
export const DEFAULT_SIDEBAR_VIA = GP_SIDEBAR_VIA;

/**
 * Where each key is consumed — shown as picker hints in Society Settings.
 */
export const THEME_COLOR_USAGE: Record<keyof ThemeColors, string> = {
  primaryColor: "Buttons, links, active tabs, progress bars (web + mobile)",
  primaryHover: "Pressed / hover state on primary buttons (web + mobile)",
  primaryLight: "Subtle highlight backgrounds, info badges (web + mobile)",
  primaryContainer: "Chip / container backgrounds tinted with brand (mobile)",
  secondaryColor: "Secondary actions, links, gradient middle stop (web + mobile)",
  accentColor: "Success states, accent chips, gradient end stop (web + mobile)",
  gradientStart: "Brand gradient start — headers, hero banners (web + mobile)",
  gradientMiddle: "Brand gradient middle stop (web + mobile)",
  gradientEnd: "Brand gradient end stop (web + mobile)",
  buttonBg: "Primary button fill (web + mobile)",
  buttonText: "Label text on primary buttons (web + mobile)",
  secondaryButtonBg: "Secondary / outline button fill (web + mobile)",
  secondaryButtonText: "Label text on secondary buttons (web + mobile)",
  headingColor: "Screen titles, card headings (web + mobile)",
  bodyTextColor: "Paragraphs, list subtitles, table cells (web + mobile)",
  mutedTextColor: "Hints, timestamps, placeholders (web + mobile)",
  backgroundColor: "Page background behind cards (web + mobile)",
  cardColor: "Cards, sheets, modals, panels (web + mobile)",
  fieldBg: "Text field / search input fill (web + mobile)",
  fieldText: "Text typed inside inputs (mobile)",
  sidebarBg: "Admin left navigation gradient base (web only)",
  sidebarActiveColor: "Selected menu item pill in sidebar (web only)",
  borderColor: "Card borders, dividers, input outlines (web + mobile)",
  iconColor: "Toolbar & list icons (mobile)",
  iconBg: "Icon button / tile backgrounds (mobile)",
  warningColor: "Pending / warning badges and alerts (web + mobile)",
  errorColor: "Errors, destructive actions, denied states (web + mobile)",
};

/** Heal known bad values from an earlier defaults bug (white sidebar). */
export function normalizeThemeColors(colors: ThemeColors): ThemeColors {
  const healed = { ...colors };
  const sidebar = healed.sidebarBg.trim().toUpperCase();
  if (sidebar === "#FFFFFF" || sidebar === "#FFF") {
    healed.sidebarBg = DEFAULT_THEME_COLORS.sidebarBg;
  }
  return healed;
}

export function mergeThemeColors(
  partial: Record<string, string> | null | undefined,
): ThemeColors {
  if (!partial) return { ...DEFAULT_THEME_COLORS };
  return normalizeThemeColors({
    ...DEFAULT_THEME_COLORS,
    ...partial,
  } as ThemeColors);
}
