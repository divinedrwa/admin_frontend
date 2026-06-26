/**
 * Canonical society theme defaults — keep in sync with:
 * - `scripts/generate-theme-css.mjs` (web CSS variables)
 * - `divine_app/lib/theme/app_colors.dart` (`AppColorPalette.light`)
 * - `divine_app/lib/core/theme/app_colors_bridge.dart` (`AppColorState.defaults`)
 *
 * Palette derived from the GatePass+ Play Store asset pack:
 * deep teal-green brand, dark teal sidebar, vibrant green accents.
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

/** GatePass+ Play Store asset pack — forest teal brand, dark teal sidebar. */
export const DEFAULT_THEME_COLORS: ThemeColors = {
  primaryColor: "#004D40",
  primaryHover: "#003D33",
  primaryLight: "#E0F2F1",
  primaryContainer: "#E8F5F0",
  secondaryColor: "#00695C",
  accentColor: "#00C853",
  gradientStart: "#003D33",
  gradientMiddle: "#004D40",
  gradientEnd: "#00796B",
  buttonBg: "#004D40",
  buttonText: "#FFFFFF",
  secondaryButtonBg: "#00695C",
  secondaryButtonText: "#FFFFFF",
  headingColor: "#1A2B3C",
  bodyTextColor: "#5A6472",
  mutedTextColor: "#6B7480",
  backgroundColor: "#F4F7F6",
  cardColor: "#FFFFFF",
  fieldBg: "#F8FAF9",
  fieldText: "#262626",
  sidebarBg: "#003D33",
  sidebarActiveColor: "#00796B",
  borderColor: "#E0E8E4",
  iconColor: "#5A6472",
  iconBg: "#FFFFFF",
  warningColor: "#FB8C00",
  errorColor: "#E53935",
};

/** Mid-tone stop for the sidebar gradient (`--gp-sidebar-via`). */
export const DEFAULT_SIDEBAR_VIA = "#004D40";

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
