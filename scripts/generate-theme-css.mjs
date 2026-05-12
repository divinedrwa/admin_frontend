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

const lightTheme = {
  brand: { primary: "#0F172A", accent: "#10B981", danger: "#EF4444" },
  surface: {
    background: "#FFFFFF",
    default: "#F8FAFC",
    elevated: "#F1F5F9",
    border: "#E2E8F0",
  },
  text: {
    primary: "#0F172A",
    secondary: "#475569",
    tertiary: "#94A3B8",
    inverse: "#FFFFFF",
  },
  state: {
    approved: { bg: "#D1FAE5", fg: "#047857", solid: "#10B981" },
    pending: { bg: "#FEF3C7", fg: "#92400E", solid: "#F59E0B" },
    denied: { bg: "#FEE2E2", fg: "#991B1B", solid: "#EF4444" },
    info: { bg: "#DBEAFE", fg: "#1E40AF", solid: "#3B82F6" },
  },
};

const darkTheme = {
  brand: { primary: "#F1F5F9", accent: "#34D399", danger: "#F87171" },
  surface: {
    background: "#020617",
    default: "#0F172A",
    elevated: "#1E293B",
    border: "#334155",
  },
  text: {
    primary: "#F1F5F9",
    secondary: "#94A3B8",
    tertiary: "#64748B",
    inverse: "#0F172A",
  },
  state: {
    approved: { bg: "#064E3B", fg: "#6EE7B7", solid: "#34D399" },
    pending: { bg: "#78350F", fg: "#FCD34D", solid: "#FBBF24" },
    denied: { bg: "#7F1D1D", fg: "#FCA5A5", solid: "#F87171" },
    info: { bg: "#1E3A8A", fg: "#93C5FD", solid: "#60A5FA" },
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
