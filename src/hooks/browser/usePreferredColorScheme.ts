import { useMediaQuery } from './useMediaQuery';

export type ColorScheme = 'light' | 'dark' | 'no-preference';

/**
 * The user's OS/browser colour scheme preference, from the
 * `prefers-color-scheme` media feature (built on `useMediaQuery`).
 *
 * Current browsers always report `light` or `dark`: the `no-preference` value
 * was removed from the spec. This hook returns `'no-preference'` only when the
 * answer is unknown — on the server, during hydration, and without
 * `matchMedia` — so you can render a neutral (or CSS-driven) theme first.
 *
 * Prefer CSS (`@media (prefers-color-scheme: dark)`, `color-scheme`,
 * `light-dark()`) for styling; use the hook when JavaScript needs the value,
 * e.g. to pick a chart palette or a code-highlighting theme.
 */
export function usePreferredColorScheme(): ColorScheme {
  const dark = useMediaQuery('(prefers-color-scheme: dark)');
  const light = useMediaQuery('(prefers-color-scheme: light)');
  if (dark) return 'dark';
  if (light) return 'light';
  return 'no-preference';
}
