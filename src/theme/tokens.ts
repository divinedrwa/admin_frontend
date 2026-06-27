/**
 * GatePass+ design tokens — single source of truth for colours, spacing,
 * radii and typography on the web admin. Token names are identical to the
 * Flutter tokens in `divine_app/lib/theme/`, so Figma specs read the same
 * on both clients.
 *
 * **Do NOT hard-code colours, spacing or radii in components.** A CI grep
 * check forbids hex literals, `rgb()` / `rgba()` and raw px sizes outside
 * `src/theme/`. Use the CSS variables emitted by `theme-vars.css`, or read
 * a token via `useTheme()`.
 *
 * Future API-driven theming: the `ThemeProvider` accepts a `tokens` prop
 * that overrides these defaults. Once you have `GET /api/theme`, pass the
 * response down and the whole admin re-skins atomically.
 */

// -------------------- Colour palette --------------------

/**
 * Triplet for a semantic state (approved / pending / denied / info).
 * `bg` for the subtle background, `fg` for text on that background,
 * `solid` for the saturated swatch / icon fill.
 */
export interface StateTriplet {
  readonly bg: string;
  readonly fg: string;
  readonly solid: string;
}

export interface Theme {
  readonly brand: {
    readonly primary: string;
    readonly primaryHover: string;
    readonly primaryLight: string;
    readonly accent: string;
    readonly danger: string;
  };
  readonly sidebar: {
    readonly from: string;
    readonly via: string;
    readonly to: string;
    readonly activeText: string;
    readonly activeBg: string;
    readonly hoverBg: string;
    readonly mutedText: string;
    readonly border: string;
  };
  readonly login: {
    readonly from: string;
    readonly via: string;
    readonly to: string;
  };
  readonly superLogin: {
    readonly from: string;
    readonly via: string;
    readonly to: string;
  };
  readonly surface: {
    readonly background: string;
    readonly default: string;
    readonly elevated: string;
    readonly border: string;
  };
  readonly text: {
    readonly primary: string;
    readonly secondary: string;
    readonly tertiary: string;
    readonly inverse: string;
  };
  readonly state: {
    readonly approved: StateTriplet;
    readonly pending: StateTriplet;
    readonly denied: StateTriplet;
    readonly info: StateTriplet;
  };
}

// =============================================================
//  GatePass+ brand palette — official identity (navy / blue / green).
//  Keep in sync with `defaultThemeColors.ts` and `generate-theme-css.mjs`.
// =============================================================

export const lightTheme: Theme = {
  brand: {
    primary: "#0D1B3D",
    primaryHover: "#091428",
    primaryLight: "#E8ECF4",
    accent: "#16A34A",
    danger: "#DC2626",
  },
  sidebar: {
    from: "#0D1B3D",
    via: "#1A3568",
    to: "#0D1B3D",
    activeText: "#FFFFFF",
    activeBg: "#16A34A",
    hoverBg: "rgba(255,255,255,0.08)",
    mutedText: "#94A3B8",
    border: "rgba(255,255,255,0.08)",
  },
  login: {
    from: "#070F22",
    via: "#0D1B3D",
    to: "#2563EB",
  },
  superLogin: {
    from: "#050A14",
    via: "#0D1B3D",
    to: "#000000",
  },
  surface: {
    background: "#F4F6F8",
    default: "#FFFFFF",
    elevated: "#F4F6F8",
    border: "#E2E8F0",
  },
  text: {
    primary: "#0D1B3D",
    secondary: "#374151",
    tertiary: "#6B7280",
    inverse: "#FFFFFF",
  },
  state: {
    approved: { bg: "#DCFCE7", fg: "#166534", solid: "#16A34A" },
    pending: { bg: "#FEF3C7", fg: "#B45309", solid: "#D97706" },
    denied: { bg: "#FEE2E2", fg: "#B91C1C", solid: "#DC2626" },
    info: { bg: "#DBEAFE", fg: "#1D4ED8", solid: "#2563EB" },
  },
};

export const darkTheme: Theme = {
  brand: {
    primary: "#26A69A",
    primaryHover: "#00897B",
    primaryLight: "#0A2E28",
    accent: "#00E676",
    danger: "#EF5350",
  },
  sidebar: {
    from: "#00251A",
    via: "#003D33",
    to: "#00251A",
    activeText: "#FFFFFF",
    activeBg: "#00796B",
    hoverBg: "rgba(255,255,255,0.06)",
    mutedText: "#6B7580",
    border: "rgba(255,255,255,0.06)",
  },
  login: {
    from: "#00251A",
    via: "#003D33",
    to: "#004D40",
  },
  superLogin: {
    from: "#001A14",
    via: "#00251A",
    to: "#000000",
  },
  surface: {
    background: "#121212",
    default: "#1E1E1E",
    elevated: "#2C2C2C",
    border: "#374151",
  },
  text: {
    primary: "#FFFFFF",
    secondary: "#D1D5DB",
    tertiary: "#9CA3AF",
    inverse: "#111827",
  },
  state: {
    approved: { bg: "#0A2E1F", fg: "#69F0AE", solid: "#00E676" },
    pending: { bg: "#3E2723", fg: "#FFB74D", solid: "#FB8C00" },
    denied: { bg: "#3E1010", fg: "#EF9A9A", solid: "#EF5350" },
    info: { bg: "#0D2137", fg: "#90CAF9", solid: "#42A5F5" },
  },
};

// -------------------- Spacing --------------------

export const spacing = {
  s4: "4px",
  s8: "8px",
  s12: "12px",
  s16: "16px",
  s24: "24px",
  s32: "32px",
  s48: "48px",
  s64: "64px",
} as const;

export type SpacingToken = keyof typeof spacing;

// -------------------- Radius --------------------

export const radius = {
  sm: "6px",
  md: "10px",
  lg: "16px",
  full: "9999px",
} as const;

export type RadiusToken = keyof typeof radius;

// -------------------- Typography --------------------

export const typography = {
  fontFamily:
    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  size: {
    fs12: "12px",
    fs14: "14px",
    fs16: "16px",
    fs18: "18px",
    fs22: "22px",
    fs28: "28px",
    fs36: "36px",
    fs48: "48px",
  },
  weight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
} as const;

// -------------------- CSS variable names (single source of truth) --------------------

/**
 * Maps every token to the CSS custom property name we emit in
 * `theme-vars.css`. Tailwind, components and the `useTheme` runtime all
 * read these — never the hex literals above directly.
 *
 * Renaming a variable here propagates through:
 *   * `theme-vars.css` (regenerated by `scripts/generate-theme-css.mjs`)
 *   * `tailwind.config.ts` (which interpolates these strings)
 *   * Any inline `var(--...)` reference in a component
 */
export const cssVar = {
  brand: {
    primary: "--gp-brand-primary",
    primaryHover: "--gp-brand-primary-hover",
    primaryLight: "--gp-brand-primary-light",
    accent: "--gp-brand-accent",
    danger: "--gp-brand-danger",
  },
  sidebar: {
    from: "--gp-sidebar-from",
    via: "--gp-sidebar-via",
    to: "--gp-sidebar-to",
    activeText: "--gp-sidebar-active-text",
    activeBg: "--gp-sidebar-active-bg",
    hoverBg: "--gp-sidebar-hover-bg",
    mutedText: "--gp-sidebar-muted-text",
    border: "--gp-sidebar-border",
  },
  login: {
    from: "--gp-login-from",
    via: "--gp-login-via",
    to: "--gp-login-to",
  },
  superLogin: {
    from: "--gp-super-login-from",
    via: "--gp-super-login-via",
    to: "--gp-super-login-to",
  },
  surface: {
    background: "--gp-surface-background",
    default: "--gp-surface-default",
    elevated: "--gp-surface-elevated",
    border: "--gp-surface-border",
  },
  text: {
    primary: "--gp-text-primary",
    secondary: "--gp-text-secondary",
    tertiary: "--gp-text-tertiary",
    inverse: "--gp-text-inverse",
  },
  state: {
    approved: {
      bg: "--gp-state-approved-bg",
      fg: "--gp-state-approved-fg",
      solid: "--gp-state-approved-solid",
    },
    pending: {
      bg: "--gp-state-pending-bg",
      fg: "--gp-state-pending-fg",
      solid: "--gp-state-pending-solid",
    },
    denied: {
      bg: "--gp-state-denied-bg",
      fg: "--gp-state-denied-fg",
      solid: "--gp-state-denied-solid",
    },
    info: {
      bg: "--gp-state-info-bg",
      fg: "--gp-state-info-fg",
      solid: "--gp-state-info-solid",
    },
  },
  spacing: {
    s4: "--gp-space-4",
    s8: "--gp-space-8",
    s12: "--gp-space-12",
    s16: "--gp-space-16",
    s24: "--gp-space-24",
    s32: "--gp-space-32",
    s48: "--gp-space-48",
    s64: "--gp-space-64",
  },
  radius: {
    sm: "--gp-radius-sm",
    md: "--gp-radius-md",
    lg: "--gp-radius-lg",
    full: "--gp-radius-full",
  },
} as const;

/** Helper for inline-style refs: `style={{ color: v(cssVar.text.primary) }}` */
export const v = (cssVariable: string) => `var(${cssVariable})`;

/** localStorage key for the user's theme-mode preference. */
export const THEME_STORAGE_KEY = "gatepass-theme-mode";

/** `data-theme` attribute name on `<html>`. */
export const THEME_ATTRIBUTE = "data-theme";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedThemeMode = "light" | "dark";
