/**
 * gatepass/no-color-literal
 *
 * Forbids:
 *   * Hex colour literals (`"#FFF"`, `'#abc123'`, `"#abcdef12"`) in any
 *     string within `.ts` / `.tsx`.
 *   * `rgb(…)` / `rgba(…)` / `hsl(…)` / `hsla(…)` function calls in
 *     string templates.
 *   * Tailwind palette utility classes
 *     (`bg-blue-600`, `text-gray-900`, `border-emerald-400`, …) in any
 *     string within `.ts` / `.tsx`.
 *
 * Allowed:
 *   * Files inside `src/theme/` (the source of truth).
 *   * Token-prefixed classes: `bg-brand-*`, `bg-surface*`, `text-fg-*`,
 *     `bg-{approved,pending,denied,info}-{bg,fg,solid}`.
 *
 * Use tokens from `src/theme/tokens.ts` instead.
 */
"use strict";

const path = require("node:path");

const HEX_RE = /(?<![A-Za-z0-9])#[0-9A-Fa-f]{3,8}\b/;
const FN_RE = /\b(?:rgb|rgba|hsl|hsla)\s*\(/;
const TW_PALETTES =
  "(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)";
const TW_RE = new RegExp(
  `\\b(?:bg|text|border|ring|from|to|via|fill|stroke|outline|placeholder|caret|accent|divide)-` +
    TW_PALETTES +
    `-(?:50|100|200|300|400|500|600|700|800|900|950)\\b`,
);

/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Forbid hard-coded colour literals and raw Tailwind palette classes outside src/theme/.",
      recommended: true,
    },
    schema: [],
    messages: {
      hex: 'Hard-coded colour "{{ value }}". Use a token from src/theme/tokens.ts (or its CSS variables).',
      fn: 'Hard-coded colour function "{{ value }}". Use a token from src/theme/tokens.ts.',
      tailwind:
        'Raw Tailwind palette class "{{ value }}". Use token classes: bg-brand-*, bg-surface*, text-fg-*, bg-{approved|pending|denied|info}-*.',
    },
  },

  create(context) {
    const filename = context.filename ?? context.getFilename();
    const normalized = filename.replace(/\\/g, "/");
    // Allow tokens.ts itself plus everything under src/theme/
    if (normalized.includes("/src/theme/")) return {};

    function reportIfMatch(node, raw) {
      if (typeof raw !== "string" || raw.length === 0) return;
      const hex = raw.match(HEX_RE);
      if (hex) {
        context.report({
          node,
          messageId: "hex",
          data: { value: hex[0] },
        });
      }
      const fn = raw.match(FN_RE);
      if (fn) {
        context.report({
          node,
          messageId: "fn",
          data: { value: fn[0] },
        });
      }
      const tw = raw.match(TW_RE);
      if (tw) {
        context.report({
          node,
          messageId: "tailwind",
          data: { value: tw[0] },
        });
      }
    }

    return {
      Literal(node) {
        if (typeof node.value === "string") reportIfMatch(node, node.value);
      },
      TemplateElement(node) {
        const raw = node.value && node.value.cooked;
        if (typeof raw === "string") reportIfMatch(node, raw);
      },
      // Catch JSX attributes that often hold raw class strings
      // (`className="bg-blue-600"`), which TemplateElement and Literal
      // already cover via the inner string value — no extra work needed.
    };
  },
};

// Silence the unused-vars lint on the path import — kept for parity with
// the project structure.
void path;
