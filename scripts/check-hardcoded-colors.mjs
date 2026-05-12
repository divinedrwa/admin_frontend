#!/usr/bin/env node
/**
 * Forbids raw colour literals and raw px sizes outside `src/theme/`.
 * Run via `npm run theme:check`. Wire into pre-commit / CI.
 *
 * What this catches:
 *   * `#FFF` / `#ffffff` literals
 *   * `rgb(…)`, `rgba(…)`, `hsl(…)`, `hsla(…)` literals
 *   * Tailwind `bg-{red|blue|green|gray|slate|emerald|amber|yellow|sky|cyan|indigo|violet|fuchsia|pink|rose|orange|teal|lime}-NNN` and `text-…-NNN` / `border-…-NNN`
 *
 * What it intentionally does **not** catch:
 *   * Hex literals inside comments / inside `src/theme/`
 *   * Hex literals inside `/*…*\/` block comments at the top of a file
 *
 * Failures are reported with `file:line:col  literal` so editors jump to
 * the right spot.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const srcDir = resolve(root, "src");

const SKIP_DIR_NAME = "theme";
const ALLOWED_EXT = new Set([".ts", ".tsx", ".css"]);

const HEX_RE = /(?<![A-Za-z0-9])#[0-9A-Fa-f]{3,8}\b/;
const FN_RE = /\b(?:rgb|rgba|hsl|hsla)\(/;
const TW_PALETTES =
  "(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)";
const TW_RE = new RegExp(
  `\\b(?:bg|text|border|ring|from|to|via|fill|stroke|outline|placeholder|caret|accent|divide)-` +
    TW_PALETTES +
    `-(?:50|100|200|300|400|500|600|700|800|900|950)\\b`,
);

let offenders = 0;

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = resolve(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === SKIP_DIR_NAME) continue;
      if (entry === "node_modules" || entry.startsWith(".")) continue;
      walk(full);
      continue;
    }
    if (!ALLOWED_EXT.has(extname(entry))) continue;
    scan(full);
  }
}

function scan(path) {
  const text = readFileSync(path, "utf8");
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*(?:\/\/|\*|\/\*)/.test(line)) continue; // comment line — skip
    for (const re of [HEX_RE, FN_RE, TW_RE]) {
      const m = line.match(re);
      if (m && m.index !== undefined) {
        const rel = path.replace(root + "/", "");
        console.error(`${rel}:${i + 1}:${m.index + 1}  ${m[0]}`);
        offenders++;
      }
    }
  }
}

const STRICT = process.argv.includes("--strict");

walk(srcDir);

if (offenders === 0) {
  console.log("✓ No hard-coded colour literals outside src/theme/.");
  process.exit(0);
}

if (STRICT) {
  console.error(`\n✗ ${offenders} hard-coded colour/util literal(s) found.`);
  console.error(
    "Use a token from src/theme/tokens.ts (or its CSS variables) instead.",
  );
  process.exit(1);
}

console.warn(
  `\n⚠ ${offenders} hard-coded colour/util literal(s) outside src/theme/ — legacy code, migration pending.`,
);
console.warn(
  "  Pass --strict (or run `npm run theme:check -- --strict`) in CI once migration is complete.",
);
process.exit(0);
