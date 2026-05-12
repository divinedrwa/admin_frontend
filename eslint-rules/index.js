/**
 * Local ESLint plugin for GatePass+ admin web.
 * Loaded via `.eslintrc.json` as `"plugin:gatepass/recommended"` or as
 * individual rules under the `gatepass/` prefix.
 *
 * Rules:
 *   * `gatepass/no-color-literal` — forbids hex literals, rgb/hsl
 *     function calls, and raw Tailwind palette classes outside
 *     `src/theme/`.
 */
"use strict";

const noColorLiteral = require("./no-color-literal");

module.exports = {
  rules: {
    "no-color-literal": noColorLiteral,
  },
  configs: {
    recommended: {
      plugins: ["gatepass"],
      rules: {
        "gatepass/no-color-literal": "warn",
      },
    },
  },
};
