import { THEME_ATTRIBUTE, THEME_STORAGE_KEY } from "./tokens";

/**
 * Inline `<script>` that runs **before** React hydration and sets the
 * `data-theme` attribute on `<html>`. Without this you see a one-frame
 * flash of light-mode CSS variables before the React tree paints.
 *
 * Inject this in the root layout's `<head>` *as the first child*, e.g.:
 *
 * ```tsx
 * import { ThemeFlashPrevention } from "@/theme/flash-prevention";
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html lang="en" suppressHydrationWarning>
 *       <head>
 *         <ThemeFlashPrevention />
 *       </head>
 *       <body>{children}</body>
 *     </html>
 *   );
 * }
 * ```
 *
 * The script is the bare minimum to read localStorage and apply
 * `data-theme`. Keep it small so the page doesn't pay a parse cost.
 */
export function ThemeFlashPrevention() {
  const script = `
(function () {
  try {
    var key = '${THEME_STORAGE_KEY}';
    var attr = '${THEME_ATTRIBUTE}';
    var stored = localStorage.getItem(key);
    var mode = (stored === 'light' || stored === 'dark' || stored === 'system') ? stored : 'system';
    var resolved = mode;
    if (mode === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    var html = document.documentElement;
    html.setAttribute(attr, resolved);
    html.style.colorScheme = resolved;
  } catch (e) {}
})();`.trim();

  return (
    <script
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: script }}
    />
  );
}
