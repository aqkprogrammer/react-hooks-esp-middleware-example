import type { ColorScheme } from '../../../hooks';

export type ThemeChoice = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'scenario:theme-choice';

export const isThemeChoice = (value: unknown): value is ThemeChoice =>
  value === 'light' || value === 'dark' || value === 'system';

/** `system` follows the OS; an unknown preference (no matchMedia, SSR) falls back to light. */
export function resolveTheme(choice: ThemeChoice, system: ColorScheme): ResolvedTheme {
  if (choice !== 'system') return choice;
  return system === 'dark' ? 'dark' : 'light';
}
