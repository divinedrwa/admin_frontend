/**
 * Professional ready-made theme templates for the Society Settings theme picker.
 *
 * A curated set of 20 polished LIGHT palettes (deep, tasteful brand hues on clean
 * neutral surfaces — the "Slate Professional" aesthetic). Each is generated from a
 * compact seed plus fixed, WCAG-safe surface/text rules so every palette stays
 * consistent and readable. Button label color is auto-chosen (white or near-black)
 * from the fill's luminance, so no combination is ever unreadable.
 *
 * Applying a template just sets the society's `themeColors`, which the web admin and
 * the mobile app both read — so it re-skins everywhere over-the-air, no rebuild.
 */
import type { ThemeColors } from "./defaultThemeColors";

export type ThemeTemplate = {
  id: string;
  name: string;
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

const channels = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

/** Linear-mix two #rrggbb hex colors. t=0 → a, t=1 → b. */
function mix(a: string, b: string, t: number): string {
  const pa = channels(a);
  const pb = channels(b);
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

/** WCAG-readable label color for a given fill — white on dark fills, ink on light. */
function readableText(bg: string): string {
  const [r, g, b] = channels(bg).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const contrastWithWhite = 1.05 / (lum + 0.05);
  return contrastWithWhite >= 3.2 ? "#FFFFFF" : "#0B1220";
}

// Fixed, professional light surface/text system (AA verified, theme-agnostic).
const S = {
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

function build(s: Seed): ThemeColors {
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
    buttonText: readableText(s.primary),
    secondaryButtonBg: s.secondary,
    secondaryButtonText: readableText(s.secondary),
    headingColor: S.heading,
    bodyTextColor: S.body,
    mutedTextColor: S.muted,
    backgroundColor: S.background,
    cardColor: S.card,
    fieldBg: S.fieldBg,
    fieldText: S.fieldText,
    sidebarBg: s.sidebar,
    sidebarActiveColor: s.primary,
    borderColor: S.border,
    iconColor: S.icon,
    iconBg: S.iconBg,
    warningColor: S.warning,
    errorColor: S.error,
  };
}

// Curated for variety + professionalism: teals/greens, blues, indigo/violet,
// refined neutrals, and tasteful warm tones. Deep brand hues, muted accents.
const SEEDS: Seed[] = [
  { id: "forest-teal", name: "Forest Teal", primary: "#004D40", primaryDark: "#00352C", secondary: "#00695C", accent: "#0F9D74", sidebar: "#00352C" },
  { id: "emerald", name: "Emerald", primary: "#047857", primaryDark: "#065F46", secondary: "#059669", accent: "#10B981", sidebar: "#043D2E" },
  { id: "pine-green", name: "Pine Green", primary: "#15803D", primaryDark: "#166534", secondary: "#16A34A", accent: "#22C55E", sidebar: "#14532D" },
  { id: "teal-cyan", name: "Teal Cyan", primary: "#0E7490", primaryDark: "#155E75", secondary: "#0891B2", accent: "#06B6D4", sidebar: "#0A3A47" },
  { id: "muted-teal", name: "Muted Teal", primary: "#0F766E", primaryDark: "#115E59", secondary: "#14B8A6", accent: "#2DD4BF", sidebar: "#134E4A" },
  { id: "ocean-blue", name: "Ocean Blue", primary: "#0B66D8", primaryDark: "#0A52AE", secondary: "#0C7BC4", accent: "#0EA5E9", sidebar: "#0F2547" },
  { id: "sapphire", name: "Sapphire", primary: "#1D4ED8", primaryDark: "#1A43B8", secondary: "#2563EB", accent: "#3B82F6", sidebar: "#13224A" },
  { id: "midnight-navy", name: "Midnight Navy", primary: "#1E3A8A", primaryDark: "#172B66", secondary: "#2546A8", accent: "#3B82F6", sidebar: "#111C3A" },
  { id: "steel-blue", name: "Steel Blue", primary: "#0369A1", primaryDark: "#075985", secondary: "#0284C7", accent: "#0EA5E9", sidebar: "#0B2E45" },
  { id: "royal-indigo", name: "Royal Indigo", primary: "#4338CA", primaryDark: "#3730A3", secondary: "#6366F1", accent: "#818CF8", sidebar: "#1E1B4B" },
  { id: "violet", name: "Violet", primary: "#6D28D9", primaryDark: "#5B21B6", secondary: "#7C3AED", accent: "#A78BFA", sidebar: "#2E1065" },
  { id: "plum", name: "Plum", primary: "#7E22CE", primaryDark: "#6B21A8", secondary: "#9333EA", accent: "#A855F7", sidebar: "#3B0764" },
  { id: "slate-pro", name: "Slate Professional", primary: "#334155", primaryDark: "#1E293B", secondary: "#475569", accent: "#0EA5E9", sidebar: "#0F172A" },
  { id: "charcoal-blue", name: "Charcoal Blue", primary: "#1F2937", primaryDark: "#111827", secondary: "#374151", accent: "#3B82F6", sidebar: "#0B1220" },
  { id: "graphite", name: "Graphite", primary: "#3F3F46", primaryDark: "#27272A", secondary: "#52525B", accent: "#6366F1", sidebar: "#18181B" },
  { id: "espresso", name: "Espresso", primary: "#57534E", primaryDark: "#44403C", secondary: "#78716C", accent: "#D97706", sidebar: "#292524" },
  { id: "burgundy", name: "Burgundy", primary: "#9F1239", primaryDark: "#881337", secondary: "#BE123C", accent: "#E11D48", sidebar: "#4C0519" },
  { id: "ruby", name: "Ruby", primary: "#B91C1C", primaryDark: "#991B1B", secondary: "#DC2626", accent: "#EF4444", sidebar: "#450A0A" },
  { id: "terracotta", name: "Terracotta", primary: "#C2410C", primaryDark: "#9A3412", secondary: "#EA580C", accent: "#F97316", sidebar: "#431407" },
  { id: "bronze-amber", name: "Bronze Amber", primary: "#92400E", primaryDark: "#78350F", secondary: "#B45309", accent: "#D97706", sidebar: "#1C1917" },
  // Indian & spiritual palettes
  // Indian flag: saffron primary, white surfaces (the white band), India green secondary + sidebar, true saffron accent
  { id: "indian-tricolor", name: "Indian Tricolor", primary: "#E2670A", primaryDark: "#B85309", secondary: "#138808", accent: "#FF9933", sidebar: "#0B5226" },
  { id: "bhagwa-saffron", name: "Bhagwa Saffron", primary: "#B5530E", primaryDark: "#8A3E08", secondary: "#E2670A", accent: "#FF9933", sidebar: "#5A2D0C" },
  { id: "temple-maroon", name: "Temple Maroon", primary: "#7F1D1D", primaryDark: "#641515", secondary: "#9F1239", accent: "#EA580C", sidebar: "#450A0A" },
  { id: "marigold-gold", name: "Marigold Gold", primary: "#A16207", primaryDark: "#854D0E", secondary: "#CA8A04", accent: "#EAB308", sidebar: "#713F12" },
  // Monochrome / neutral
  { id: "monochrome", name: "Black & White", primary: "#18181B", primaryDark: "#000000", secondary: "#3F3F46", accent: "#52525B", sidebar: "#000000" },
  { id: "soft-grey", name: "White & Grey", primary: "#64748B", primaryDark: "#475569", secondary: "#78909C", accent: "#94A3B8", sidebar: "#475569" },
];

export const THEME_TEMPLATES: ThemeTemplate[] = SEEDS.map((s) => ({
  id: s.id,
  name: s.name,
  colors: build(s),
}));
