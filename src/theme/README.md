# GatePass+ Theme System (Web admin)

A token-based theme system that lives in `src/theme/`. Every colour, every
spacing unit, every border radius the admin renders comes from here —
**zero `#hex` or `rgb(…)` literals allowed outside `src/theme/`**, and **no
raw Tailwind palette classes** like `bg-blue-600` or `text-gray-900` either.

Goal: a future rebrand = edit one file (`tokens.ts`) and every page
updates atomically. The same token names exist in the Flutter app so
Figma specs read the same on both clients.

---

## File map

| File | What lives here |
|---|---|
| [`tokens.ts`](tokens.ts) | The single source of truth — exports `lightTheme`, `darkTheme`, `spacing`, `radius`, `typography`, `cssVar`. |
| [`theme-vars.css`](theme-vars.css) | **Generated** CSS variables on `:root` and `[data-theme="dark"]`. Do not edit by hand. |
| [`ThemeProvider.tsx`](ThemeProvider.tsx) | React Context — manages Light / Dark / System mode, persists to `localStorage`, watches the OS `prefers-color-scheme` media query. |
| [`useTheme.ts`](useTheme.ts) | Hook returning `{ theme, mode, resolvedMode, setMode }`. |
| [`flash-prevention.tsx`](flash-prevention.tsx) | Inline `<script>` that sets `data-theme` on `<html>` before hydration. Goes in `layout.tsx`'s `<head>`. |
| [`components/ThemeModeToggle.tsx`](components/ThemeModeToggle.tsx) | 3-way segmented Light / Dark / System control. |
| [`components/VisitorApprovalCard.tsx`](components/VisitorApprovalCard.tsx) | Reference card that uses every token category. |
| [`../../scripts/generate-theme-css.mjs`](../../scripts/generate-theme-css.mjs) | Build script that regenerates `theme-vars.css` from `tokens.ts`. |
| [`../../scripts/check-hardcoded-colors.mjs`](../../scripts/check-hardcoded-colors.mjs) | Lint script — fails CI if any hex literal or raw Tailwind palette class appears outside `src/theme/`. |

---

## How the system is wired

```
src/theme/tokens.ts                ← source of truth
  ├─ npm run theme:gen
  └─ src/theme/theme-vars.css      ← :root + [data-theme="dark"]

src/app/globals.css                ← @imports theme-vars.css
tailwind.config.ts                 ← extends colours/spacing/radius as var(--gp-...)
src/app/layout.tsx
  ├─ <head><ThemeFlashPrevention /></head>   ← sets data-theme pre-hydration
  └─ <body><ThemeProvider>{children}</ThemeProvider></body>
```

The Tailwind config maps semantic class names to CSS variables:

* `bg-brand-accent` → `var(--gp-brand-accent)`
* `text-fg-primary` → `var(--gp-text-primary)`
* `bg-approved-bg` / `text-approved-fg` / `bg-approved-solid`
* `bg-pending-bg`, `bg-denied-bg`, `bg-info-bg` …
* `rounded-md`, `rounded-lg`, `rounded-full` → token radii
* `p-16`, `gap-8`, `px-12` → token spacing (the numbers are the **token name**, not the px)
* `text-14`, `text-22` → token font sizes

`ThemeProvider` swaps `data-theme="light" | "dark"` on `<html>` based on
the user's choice; the CSS variables instantly re-resolve and every
component re-renders without state changes.

---

## Use in a component

```tsx
import { ThemeModeToggle } from "@/theme/components/ThemeModeToggle";

export function StatusPill({ status }: { status: "approved" | "pending" | "denied" }) {
  const map = {
    approved: "bg-approved-bg text-approved-fg",
    pending: "bg-pending-bg text-pending-fg",
    denied: "bg-denied-bg text-denied-fg",
  };
  return (
    <span className={`rounded-full px-12 py-4 text-12 font-medium ${map[status]}`}>
      {status.toUpperCase()}
    </span>
  );
}
```

Notice: **no** hex literals, **no** `bg-green-100`, **no** `dark:bg-…`
conditionals. Dark mode just works because the CSS variables re-resolve
when `data-theme="dark"`.

If you need a token at runtime (animation, dynamic style):

```tsx
"use client";
import { useTheme } from "@/theme/useTheme";

export function ChartTooltip() {
  const { theme } = useTheme();
  return <Tooltip backgroundColor={theme.surface.elevated} textColor={theme.text.primary} />;
}
```

---

## Token reference (web ↔ Flutter parity)

### Brand — `bg-brand-{primary|accent|danger}` · `text-brand-{...}`

| | Light | Dark |
|---|---|---|
| primary | `#0F172A` | `#F1F5F9` |
| accent (primary action — "Allow entry") | `#10B981` | `#34D399` |
| danger (destructive — "Block visitor") | `#EF4444` | `#F87171` |

### Surface — `bg-surface{,-elevated,-background}` · `border-surface-border`

| | Light | Dark |
|---|---|---|
| background | `#FFFFFF` | `#020617` |
| (default) | `#F8FAFC` | `#0F172A` |
| elevated | `#F1F5F9` | `#1E293B` |
| border | `#E2E8F0` | `#334155` |

### Text — `text-fg-{primary|secondary|tertiary|inverse}`

| | Light | Dark |
|---|---|---|
| primary | `#0F172A` | `#F1F5F9` |
| secondary | `#475569` | `#94A3B8` |
| tertiary | `#94A3B8` | `#64748B` |
| inverse | `#FFFFFF` | `#0F172A` |

### State — `bg-{approved|pending|denied|info}-{bg|solid}` · `text-{...}-fg`

| | Light bg / fg / solid | Dark bg / fg / solid |
|---|---|---|
| approved | `#D1FAE5` / `#047857` / `#10B981` | `#064E3B` / `#6EE7B7` / `#34D399` |
| pending | `#FEF3C7` / `#92400E` / `#F59E0B` | `#78350F` / `#FCD34D` / `#FBBF24` |
| denied | `#FEE2E2` / `#991B1B` / `#EF4444` | `#7F1D1D` / `#FCA5A5` / `#F87171` |
| info | `#DBEAFE` / `#1E40AF` / `#3B82F6` | `#1E3A8A` / `#93C5FD` / `#60A5FA` |

### Spacing — `p-4 / p-8 / p-12 / p-16 / p-24 / p-32 / p-48 / p-64`
### Radius — `rounded-sm / rounded-md / rounded-lg / rounded-full`
### Font size — `text-12 / text-14 / text-16 / text-18 / text-22 / text-28 / text-36 / text-48`

> The Tailwind spacing values use the token name (`p-16` = 16 px), not
> Tailwind's default `4 ↔ 1rem` scale. This makes Figma → code 1:1.

---

## How to add a token

1. Edit `tokens.ts` — add the field on `lightTheme` **and** `darkTheme`,
   add a CSS-variable name in `cssVar`.
2. Run `npm run theme:gen` (or just `npm run dev` — the dev script
   regenerates on every start).
3. If you want a Tailwind utility for it, extend
   `tailwind.config.ts` with the new var.
4. Add the same token (same name) to the Flutter side at
   `divine_app/lib/theme/app_colors.dart` and `theme_extensions.dart`
   so the two clients stay aligned.

## How to change a colour

Open `tokens.ts`. Change the hex on `lightTheme` or `darkTheme`. Run
`npm run theme:gen`. Reload. Done.

> Re-validate WCAG AA contrast for every changed pair.

---

## Why hardcoding is forbidden

* **Atomic re-skin** — one stray `bg-blue-600` in a feature page is a
  rebrand blocker.
* **Dark mode** — a hardcoded colour is a guaranteed dark-mode bug
  (white text on white background) the moment somebody forgets to add
  the `dark:` variant.
* **API-driven theming** — when we ship per-Society white-labelling
  later, hardcoded values won't update. Tokens will.

`npm run theme:check` greps every file under `src/` outside `src/theme/`
for hex literals, `rgb()` / `rgba()` / `hsl(…)` calls, and the entire
Tailwind palette family of `bg-{red|blue|green|…}-NNN`-style classes. CI
fails on any hit.

> The existing `globals.css` `.btn`, `.card`, `.badge`, `.table` etc.
> still use a few Tailwind palette classes from the legacy design system.
> Migrate those incrementally — `theme:check` is opt-in via the script
> (not enforced in `lint` yet) so the migration can land page-by-page
> without blocking unrelated PRs. Flip it to a `lint` dependency once
> the legacy classes are gone.

---

## Future: API-driven theming

`ThemeProvider` reads its initial palette from `tokens.ts`. When you're
ready to add per-Society white-labelling, extend it with a `tokens` prop:

```tsx
// Pseudocode
const { data } = useSWR("/api/theme");
return (
  <ThemeProvider tokensOverride={data ? { light: data.light, dark: data.dark } : undefined}>
    {children}
  </ThemeProvider>
);
```

Then inside `ThemeProvider`, swap the `lightTheme` / `darkTheme`
constants for `tokensOverride ?? { light: lightTheme, dark: darkTheme }`
and rewrite `<html>` CSS variables when `resolvedMode` or `tokensOverride`
changes. The whole admin re-skins without a single component touching
the new values.
