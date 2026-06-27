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
    background: "#F8FAFC",
    default: "#FFFFFF",
    elevated: "#F1F5F9",
    border: "#E2E8F0",
  },
  text: {
    primary: "#0D1B3D",
    secondary: "#475569",
    tertiary: "#64748B",
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
    primary: "#3B82F6",
    primaryHover: "#2563EB",
    primaryLight: "#1E3A5F",
    accent: "#22C55E",
    danger: "#EF4444",
  },
  sidebar: {
    from: "#060E1C",
    via: "#0D1B3D",
    to: "#060E1C",
    activeText: "#FFFFFF",
    activeBg: "#16A34A",
    hoverBg: "rgba(255,255,255,0.08)",
    mutedText: "#94A3B8",
    border: "rgba(255,255,255,0.08)",
  },
  login: {
    from: "#060E1C",
    via: "#0D1B3D",
    to: "#2563EB",
  },
  superLogin: {
    from: "#050A14",
    via: "#0D1B3D",
    to: "#000000",
  },
  surface: {
    background: "#0B1220",
    default: "#111827",
    elevated: "#1F2937",
    border: "#374151",
  },
  text: {
    primary: "#F8FAFC",
    secondary: "#94A3B8",
    tertiary: "#64748B",
    inverse: "#0D1B3D",
  },
  state: {
    approved: { bg: "#14532D", fg: "#86EFAC", solid: "#16A34A" },
    pending: { bg: "#451A03", fg: "#FCD34D", solid: "#F59E0B" },
    denied: { bg: "#450A0A", fg: "#FCA5A5", solid: "#EF4444" },
    info: { bg: "#172554", fg: "#93C5FD", solid: "#3B82F6" },
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
    "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
