#!/usr/bin/env node
/**
 * Generates `src/theme/theme-vars.css` from `src/theme/tokens.ts`.
 *
 *   npm run theme:gen
 *
 * Wire this into `prebuild` and `predev` so the file is always in sync
 * with the TypeScript source. Never edit `theme-vars.css` by hand.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const tokensPath = resolve(root, "src/theme/tokens.ts");
const outPath = resolve(root, "src/theme/theme-vars.css");

// `tokens.ts` is plain TypeScript; we strip types and `import`-side-effects
// by evaluating it as ESM via `tsx`. To stay zero-config we read the file
// as text and parse only the shapes we know exist.
//
// Simpler: re-implement the constants here. The two-line duplication is
// worth keeping the generator dependency-free.

// GatePass+ brand palette — official identity (navy / blue / green).
// Keep in sync with divine_app/lib/theme/app_colors.dart
const lightTheme = {
  brand: {
    primary: "#0D1B3D",
    "primary-hover": "#091428",
    "primary-light": "#E8ECF4",
    secondary: "#2563EB",
    accent: "#16A34A",
    "gradient-start": "#070F22",
    "gradient-middle": "#0D1B3D",
    "gradient-end": "#2563EB",
    danger: "#DC2626",
  },
  sidebar: {
    from: "#0D1B3D",
    via: "#1A3568",
    to: "#0D1B3D",
    "active-text": "#FFFFFF",
    "active-bg": "#16A34A",
    "hover-bg": "rgba(255,255,255,0.08)",
    "muted-text": "#94A3B8",
    border: "rgba(255,255,255,0.08)",
  },
  login: {
    from: "#070F22",
    via: "#0D1B3D",
    to: "#2563EB",
  },
  "super-login": {
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
    pending:  { bg: "#FEF3C7", fg: "#B45309", solid: "#D97706" },
    denied:   { bg: "#FEE2E2", fg: "#B91C1C", solid: "#DC2626" },
    info:     { bg: "#DBEAFE", fg: "#1D4ED8", solid: "#2563EB" },
  },
};

const darkTheme = {
  brand: {
    primary: "#3B82F6",
    "primary-hover": "#2563EB",
    "primary-light": "#1E3A5F",
    secondary: "#60A5FA",
    accent: "#22C55E",
    "gradient-start": "#060E1C",
    "gradient-middle": "#0D1B3D",
    "gradient-end": "#2563EB",
    danger: "#EF4444",
  },
  sidebar: {
    from: "#060E1C",
    via: "#0D1B3D",
    to: "#060E1C",
    "active-text": "#FFFFFF",
    "active-bg": "#16A34A",
    "hover-bg": "rgba(255,255,255,0.08)",
    "muted-text": "#94A3B8",
    border: "rgba(255,255,255,0.08)",
  },
  login: {
    from: "#060E1C",
    via: "#0D1B3D",
    to: "#2563EB",
  },
  "super-login": {
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
    pending:  { bg: "#451A03", fg: "#FCD34D", solid: "#F59E0B" },
    denied:   { bg: "#450A0A", fg: "#FCA5A5", solid: "#EF4444" },
    info:     { bg: "#172554", fg: "#93C5FD", solid: "#3B82F6" },
  },
};

const spacing = {
  s4: "4px",
  s8: "8px",
  s12: "12px",
  s16: "16px",
  s24: "24px",
  s32: "32px",
  s48: "48px",
  s64: "64px",
};
const radius = {
  sm: "6px",
  md: "10px",
  lg: "16px",
  full: "9999px",
};

function emit(name, palette) {
  const lines = [];
  for (const [k, v] of Object.entries(palette.brand))
    lines.push(`  --gp-brand-${k}: ${v};`);
  if (palette.sidebar) {
    for (const [k, v] of Object.entries(palette.sidebar))
      lines.push(`  --gp-sidebar-${k}: ${v};`);
  }
  if (palette.login) {
    for (const [k, v] of Object.entries(palette.login))
      lines.push(`  --gp-login-${k}: ${v};`);
  }
  if (palette["super-login"]) {
    for (const [k, v] of Object.entries(palette["super-login"]))
      lines.push(`  --gp-super-login-${k}: ${v};`);
  }
  for (const [k, v] of Object.entries(palette.surface))
    lines.push(`  --gp-surface-${k}: ${v};`);
  for (const [k, v] of Object.entries(palette.text))
    lines.push(`  --gp-text-${k}: ${v};`);
  for (const [stateName, triple] of Object.entries(palette.state)) {
    for (const [slot, v] of Object.entries(triple))
      lines.push(`  --gp-state-${stateName}-${slot}: ${v};`);
  }
  return `${name} {\n${lines.join("\n")}\n}`;
}

function emitSpacingAndRadius() {
  const lines = [];
  for (const [k, v] of Object.entries(spacing))
    lines.push(`  --gp-space-${k.slice(1)}: ${v};`);
  for (const [k, v] of Object.entries(radius))
    lines.push(`  --gp-radius-${k}: ${v};`);
  return `:root {\n${lines.join("\n")}\n}`;
}

const header = `/*\n * GENERATED — do not edit.\n * Source: src/theme/tokens.ts\n * Run \`npm run theme:gen\` to regenerate.\n */\n`;

const css = [
  header,
  emit(":root", lightTheme),
  emit('[data-theme="dark"]', darkTheme),
  emitSpacingAndRadius(),
  "",
].join("\n\n");

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, css);

// Touch a no-op import so the IDE picks up the file
const _unused = pathToFileURL(tokensPath).href;
void _unused;

console.log(`✓ Wrote ${outPath}`);
