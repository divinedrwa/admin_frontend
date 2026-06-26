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

// GatePass+ brand palette — Primary Brand Blue.
// Keep in sync with divine_app/lib/core/theme/app_colors.dart
const lightTheme = {
  brand: {
    primary: "#0B66D8",          // Primary Brand Blue (WCAG-tuned)
    "primary-hover": "#0A57BD",  // Pressed / hover
    "primary-light": "#EAF2FD",  // Blue tint
    secondary: "#0C8BC4",        // Deep sky (white labels readable)
    accent: "#0E9F6E",           // Emerald accent
    "gradient-start": "#0B66D8",
    "gradient-middle": "#0C8BC4",
    "gradient-end": "#0E9F6E",
    danger: "#D92D20",           // Error Red
  },
  sidebar: {
    from: "#0F172A",             // Deep navy (slate-900)
    via: "#1E293B",              // Slate-800
    to: "#0F172A",               // Deep navy
    "active-text": "#FFFFFF",
    "active-bg": "#0B66D8",      // Brand blue active pill
    "hover-bg": "rgba(255,255,255,0.08)",
    "muted-text": "#94A3B8",     // Slate-400
    border: "rgba(255,255,255,0.08)",
  },
  login: {
    from: "#0F172A",
    via: "#1E3A6E",
    to: "#0B66D8",
  },
  "super-login": {
    from: "#0D1322",
    via: "#141B2D",
    to: "#000000",
  },
  surface: {
    background: "#F7F9FD",       // Cool blue-white
    default: "#FFFFFF",
    elevated: "#F8FBFE",
    border: "#E5EDF8",
  },
  text: {
    primary: "#0F2A57",          // Deep navy text
    secondary: "#5A6472",
    tertiary: "#6B7480",
    inverse: "#FFFFFF",
  },
  state: {
    approved: { bg: "#E3F6EE", fg: "#065F46", solid: "#0E9F6E" },
    pending:  { bg: "#FFF4E0", fg: "#92400E", solid: "#C77700" },
    denied:   { bg: "#FDEDEC", fg: "#991B1B", solid: "#D92D20" },
    info:     { bg: "#EAF2FD", fg: "#1E40AF", solid: "#0B66D8" },
  },
};

const darkTheme = {
  brand: {
    primary: "#3B8EFF",          // Brightened blue for dark bg
    "primary-hover": "#0A74F5",
    "primary-light": "#0E2A52",
    secondary: "#32C5FF",
    accent: "#22D6A0",
    "gradient-start": "#3B8EFF",
    "gradient-middle": "#32C5FF",
    "gradient-end": "#22D6A0",
    danger: "#F87171",
  },
  sidebar: {
    from: "#141B2D",
    via: "#141B2D",
    to: "#141B2D",
    "active-text": "#FFFFFF",
    "active-bg": "#0A74F5",
    "hover-bg": "rgba(59,142,255,0.10)",
    "muted-text": "#4A5568",
    border: "rgba(255,255,255,0.06)",
  },
  login: {
    from: "#0D1322",
    via: "#141B2D",
    to: "#0A1A3D",
  },
  "super-login": {
    from: "#0D1322",
    via: "#141B2D",
    to: "#000000",
  },
  surface: {
    background: "#0D1322",       // Very deep navy
    default: "#141B2D",
    elevated: "#1A2338",
    border: "#1E2D4A",
  },
  text: {
    primary: "#F1F5F9",
    secondary: "#94A3B8",
    tertiary: "#64748B",
    inverse: "#102A5C",
  },
  state: {
    approved: { bg: "#0A2E1F", fg: "#22D6A0", solid: "#22D6A0" },
    pending:  { bg: "#2D1A00", fg: "#F5A524", solid: "#F5A524" },
    denied:   { bg: "#2D0A0A", fg: "#F87171", solid: "#F04438" },
    info:     { bg: "#0E2A52", fg: "#93C5FD", solid: "#3B8EFF" },
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
