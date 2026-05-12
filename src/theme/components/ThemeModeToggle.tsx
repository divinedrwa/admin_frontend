"use client";

import { useTheme } from "../useTheme";
import type { ThemeMode } from "../tokens";

const options: { value: ThemeMode; label: string; icon: string }[] = [
  { value: "light", label: "Light", icon: "☀" },
  { value: "dark", label: "Dark", icon: "☾" },
  { value: "system", label: "System", icon: "⚙" },
];

interface Props {
  /** Icons-only, single-column. Fits a narrow sidebar (~64px wide). */
  iconsOnly?: boolean;
}

/**
 * Three-way segmented control for the theme mode (Light / Dark / System).
 *
 *   <ThemeModeToggle />              full segmented bar
 *   <ThemeModeToggle iconsOnly />    compact column for the collapsed sidebar
 *
 * Reads/writes through `useTheme()` — no extra plumbing required.
 */
export function ThemeModeToggle({ iconsOnly = false }: Props) {
  const { mode, setMode } = useTheme();

  if (iconsOnly) {
    return (
      <div
        role="radiogroup"
        aria-label="Theme mode"
        className="flex flex-col items-stretch gap-4"
      >
        {options.map((opt) => {
          const selected = mode === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={opt.label}
              title={opt.label}
              onClick={() => setMode(opt.value)}
              className={
                selected
                  ? "rounded-md bg-brand-accent text-fg-inverse py-8 text-16 transition-colors"
                  : "rounded-md text-fg-secondary hover:text-fg-primary py-8 text-16 transition-colors"
              }
            >
              <span aria-hidden>{opt.icon}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Theme mode"
      className="inline-flex rounded-md border border-surface-border bg-surface-elevated p-4"
    >
      {options.map((opt) => {
        const selected = mode === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setMode(opt.value)}
            className={
              selected
                ? "rounded-md bg-brand-accent text-fg-inverse px-12 py-8 text-14 font-medium transition-colors"
                : "rounded-md text-fg-secondary hover:text-fg-primary px-12 py-8 text-14 font-medium transition-colors"
            }
          >
            <span aria-hidden className="mr-4">
              {opt.icon}
            </span>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
