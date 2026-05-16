import { THEME_ATTRIBUTE } from "./tokens";

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
/** Dark mode is disabled — always force light to prevent any flash. */
export function ThemeFlashPrevention() {
  const script = `
(function () {
  try {
    var attr = '${THEME_ATTRIBUTE}';
    var html = document.documentElement;
    html.setAttribute(attr, 'light');
    html.style.colorScheme = 'light';
  } catch (e) {}
})();`.trim();

  return (
    <script
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: script }}
    />
  );
}
