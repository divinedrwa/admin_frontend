/**
 * Professional ready-made theme templates for the Society Settings theme picker.
 *
 * Each template is a full {@link ThemeColors} palette. They're generated from a
 * compact seed (brand hues) plus fixed, WCAG-safe surface/text rules so every
 * palette stays internally consistent and readable:
 *   - LIGHT: dark text on light surfaces, brand-colored primary/buttons.
 *   - DARK:  light text on dark surfaces, vivid brand primary.
 *
 * Applying a template just sets the society's `themeColors`, which the web admin
 * and the mobile app both read — so it re-skins everywhere over-the-air.
 */
import type { ThemeColors } from "./defaultThemeColors";

export type ThemeTemplate = {
  id: string;
  name: string;
  mode: "light" | "dark";
  colors: ThemeColors;
};

type Seed = {
  id: string;
  name: string;
  primary: string;
  primaryDark: string;
  secondary: string;
  accent: string;
  sidebar: string;
};

/** Linear-mix two #rrggbb hex colors. t=0 → a, t=1 → b. */
function mix(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

// ---- Fixed light surface/text system (AA verified) ----
const L = {
  heading: "#111827",
  body: "#4B5563",
  muted: "#6B7280",
  background: "#F6F8FA",
  card: "#FFFFFF",
  fieldBg: "#F8FAFB",
  fieldText: "#1F2933",
  border: "#E5E7EB",
  icon: "#6B7280",
  iconBg: "#FFFFFF",
  warning: "#B45309",
  error: "#B42318",
};

// ---- Fixed dark surface/text system (AA verified) ----
const D = {
  heading: "#F0F6FC",
  body: "#C9D1D9",
  muted: "#8B949E",
  background: "#0D1117",
  card: "#161B22",
  fieldBg: "#1C2128",
  fieldText: "#E6EDF3",
  border: "#30363D",
  icon: "#8B949E",
  iconBg: "#1C2128",
  warning: "#D29922",
  error: "#F85149",
};

function buildLight(s: Seed): ThemeColors {
  const tint = mix(s.primary, "#FFFFFF", 0.9);
  return {
    primaryColor: s.primary,
    primaryHover: s.primaryDark,
    primaryLight: tint,
    primaryContainer: tint,
    secondaryColor: s.secondary,
    accentColor: s.accent,
    gradientStart: s.primaryDark,
    gradientMiddle: s.primary,
    gradientEnd: s.secondary,
    buttonBg: s.primary,
    buttonText: "#FFFFFF",
    secondaryButtonBg: s.secondary,
    secondaryButtonText: "#FFFFFF",
    headingColor: L.heading,
    bodyTextColor: L.body,
    mutedTextColor: L.muted,
    backgroundColor: L.background,
    cardColor: L.card,
    fieldBg: L.fieldBg,
    fieldText: L.fieldText,
    sidebarBg: s.sidebar,
    sidebarActiveColor: s.primary,
    borderColor: L.border,
    iconColor: L.icon,
    iconBg: L.iconBg,
    warningColor: L.warning,
    errorColor: L.error,
  };
}

function buildDark(s: Seed): ThemeColors {
  const tint = mix(s.primary, D.card, 0.78);
  return {
    primaryColor: s.primary,
    primaryHover: s.primaryDark,
    primaryLight: tint,
    primaryContainer: tint,
    secondaryColor: s.secondary,
    accentColor: s.accent,
    gradientStart: s.primaryDark,
    gradientMiddle: s.primary,
    gradientEnd: s.accent,
    buttonBg: s.primary,
    buttonText: "#FFFFFF",
    secondaryButtonBg: s.secondary,
    secondaryButtonText: "#FFFFFF",
    headingColor: D.heading,
    bodyTextColor: D.body,
    mutedTextColor: D.muted,
    backgroundColor: D.background,
    cardColor: D.card,
    fieldBg: D.fieldBg,
    fieldText: D.fieldText,
    sidebarBg: s.sidebar,
    sidebarActiveColor: s.primary,
    borderColor: D.border,
    iconColor: D.icon,
    iconBg: D.iconBg,
    warningColor: D.warning,
    errorColor: D.error,
  };
}

const LIGHT_SEEDS: Seed[] = [
  { id: "forest-teal", name: "Forest Teal", primary: "#004D40", primaryDark: "#003D33", secondary: "#00695C", accent: "#00C853", sidebar: "#003D33" },
  { id: "ocean-blue", name: "Ocean Blue", primary: "#0B66D8", primaryDark: "#0A57BD", secondary: "#0C8BC4", accent: "#06B6D4", sidebar: "#0F172A" },
  { id: "royal-indigo", name: "Royal Indigo", primary: "#4338CA", primaryDark: "#3730A3", secondary: "#6D28D9", accent: "#7C3AED", sidebar: "#1E1B4B" },
  { id: "emerald-green", name: "Emerald Green", primary: "#047857", primaryDark: "#065F46", secondary: "#059669", accent: "#10B981", sidebar: "#052E2B" },
  { id: "sunset-orange", name: "Sunset Orange", primary: "#C2410C", primaryDark: "#9A3412", secondary: "#EA580C", accent: "#F59E0B", sidebar: "#431407" },
  { id: "crimson-rose", name: "Crimson Rose", primary: "#BE123C", primaryDark: "#9F1239", secondary: "#E11D48", accent: "#F43F5E", sidebar: "#4C0519" },
  { id: "plum-purple", name: "Plum Purple", primary: "#7E22CE", primaryDark: "#6B21A8", secondary: "#9333EA", accent: "#C026D3", sidebar: "#3B0764" },
  { id: "teal-cyan", name: "Teal Cyan", primary: "#0E7490", primaryDark: "#155E75", secondary: "#0891B2", accent: "#06B6D4", sidebar: "#083344" },
  { id: "slate-pro", name: "Slate Professional", primary: "#334155", primaryDark: "#1E293B", secondary: "#475569", accent: "#0EA5E9", sidebar: "#0F172A" },
  { id: "bronze-charcoal", name: "Bronze Charcoal", primary: "#92400E", primaryDark: "#78350F", secondary: "#B45309", accent: "#D97706", sidebar: "#1C1917" },
];

const DARK_SEEDS: Seed[] = [
  { id: "midnight-blue", name: "Midnight Blue", primary: "#1F6FEB", primaryDark: "#1A5FCC", secondary: "#388BFD", accent: "#2DD4BF", sidebar: "#010409" },
  { id: "obsidian-teal", name: "Obsidian Teal", primary: "#0D9488", primaryDark: "#0F766E", secondary: "#14B8A6", accent: "#2DD4BF", sidebar: "#02100E" },
  { id: "carbon-indigo", name: "Carbon Indigo", primary: "#6366F1", primaryDark: "#4F46E5", secondary: "#818CF8", accent: "#A78BFA", sidebar: "#0B0B1E" },
  { id: "dark-emerald", name: "Dark Emerald", primary: "#059669", primaryDark: "#047857", secondary: "#10B981", accent: "#34D399", sidebar: "#02140E" },
  { id: "crimson-night", name: "Crimson Night", primary: "#DC2626", primaryDark: "#B91C1C", secondary: "#EF4444", accent: "#F87171", sidebar: "#1A0606" },
  { id: "amber-charcoal", name: "Amber Charcoal", primary: "#B45309", primaryDark: "#92400E", secondary: "#D97706", accent: "#F59E0B", sidebar: "#1C1206" },
  { id: "slate-night", name: "Slate Night", primary: "#3B82F6", primaryDark: "#2563EB", secondary: "#60A5FA", accent: "#38BDF8", sidebar: "#020617" },
  { id: "royal-purple-dark", name: "Royal Purple", primary: "#7C3AED", primaryDark: "#6D28D9", secondary: "#8B5CF6", accent: "#A78BFA", sidebar: "#14081F" },
  { id: "cyber-cyan", name: "Cyber Cyan", primary: "#0891B2", primaryDark: "#0E7490", secondary: "#06B6D4", accent: "#22D3EE", sidebar: "#04141A" },
  { id: "rose-dark", name: "Rose Dark", primary: "#BE185D", primaryDark: "#9D174D", secondary: "#DB2777", accent: "#F472B6", sidebar: "#1A0610" },
];

export const THEME_TEMPLATES: ThemeTemplate[] = [
  ...LIGHT_SEEDS.map((s) => ({ id: s.id, name: s.name, mode: "light" as const, colors: buildLight(s) })),
  ...DARK_SEEDS.map((s) => ({ id: s.id, name: s.name, mode: "dark" as const, colors: buildDark(s) })),
];
