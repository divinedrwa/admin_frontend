import type { Config } from "tailwindcss";

/**
 * Tailwind reads token values from the CSS variables emitted by
 * `src/theme/theme-vars.css` (which is generated from
 * `src/theme/tokens.ts`). This way every Tailwind class — and every
 * runtime `useTheme()` call — paints from the same source.
 *
 * Dark mode is triggered by `[data-theme="dark"]` on `<html>`, set
 * before hydration by `src/theme/flash-prevention.tsx` and by the
 * `ThemeProvider`.
 */
const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/theme/**/*.{ts,tsx}",
  ],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "var(--gp-brand-primary)",
          "primary-hover": "var(--gp-brand-primary-hover)",
          "primary-light": "var(--gp-brand-primary-light)",
          accent: "var(--gp-brand-accent)",
          danger: "var(--gp-brand-danger)",
        },
        sidebar: {
          from: "var(--gp-sidebar-from)",
          via: "var(--gp-sidebar-via)",
          to: "var(--gp-sidebar-to)",
          "active-text": "var(--gp-sidebar-active-text)",
          "active-bg": "var(--gp-sidebar-active-bg)",
          "hover-bg": "var(--gp-sidebar-hover-bg)",
          "muted-text": "var(--gp-sidebar-muted-text)",
          border: "var(--gp-sidebar-border)",
        },
        login: {
          from: "var(--gp-login-from)",
          via: "var(--gp-login-via)",
          to: "var(--gp-login-to)",
        },
        "super-login": {
          from: "var(--gp-super-login-from)",
          via: "var(--gp-super-login-via)",
          to: "var(--gp-super-login-to)",
        },
        surface: {
          background: "var(--gp-surface-background)",
          DEFAULT: "var(--gp-surface-default)",
          elevated: "var(--gp-surface-elevated)",
          border: "var(--gp-surface-border)",
        },
        fg: {
          primary: "var(--gp-text-primary)",
          secondary: "var(--gp-text-secondary)",
          tertiary: "var(--gp-text-tertiary)",
          inverse: "var(--gp-text-inverse)",
        },
        approved: {
          bg: "var(--gp-state-approved-bg)",
          fg: "var(--gp-state-approved-fg)",
          solid: "var(--gp-state-approved-solid)",
        },
        pending: {
          bg: "var(--gp-state-pending-bg)",
          fg: "var(--gp-state-pending-fg)",
          solid: "var(--gp-state-pending-solid)",
        },
        denied: {
          bg: "var(--gp-state-denied-bg)",
          fg: "var(--gp-state-denied-fg)",
          solid: "var(--gp-state-denied-solid)",
        },
        info: {
          bg: "var(--gp-state-info-bg)",
          fg: "var(--gp-state-info-fg)",
          solid: "var(--gp-state-info-solid)",
        },
      },
      spacing: {
        4: "var(--gp-space-4)",
        8: "var(--gp-space-8)",
        12: "var(--gp-space-12)",
        16: "var(--gp-space-16)",
        24: "var(--gp-space-24)",
        32: "var(--gp-space-32)",
        48: "var(--gp-space-48)",
        64: "var(--gp-space-64)",
      },
      borderRadius: {
        sm: "var(--gp-radius-sm)",
        md: "var(--gp-radius-md)",
        lg: "var(--gp-radius-lg)",
        full: "var(--gp-radius-full)",
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
      fontSize: {
        12: "12px",
        14: "14px",
        16: "16px",
        18: "18px",
        22: "22px",
        28: "28px",
        36: "36px",
        48: "48px",
      },
    },
  },
  plugins: [],
};

export default config;
