import { useEffect } from 'react';
import { useLocalStorage } from '../hooks';

export type ThemePreference = 'system' | 'light' | 'dark';

const isTheme = (value: unknown): value is ThemePreference =>
  value === 'system' || value === 'light' || value === 'dark';
const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

/** Theme preference persisted per browser and applied to <html data-theme>. */
export function useThemePreference() {
  const [theme, setTheme] = useLocalStorage<ThemePreference>('playground:theme', 'system', {
    validate: isTheme,
  });
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') delete root.dataset.theme;
    else root.dataset.theme = theme;
  }, [theme]);
  return [theme, setTheme] as const;
}

/** Ids of entries the reader marked as learned. */
export function useProgress() {
  const [completed, setCompleted, reset] = useLocalStorage<string[]>('playground:progress', [], {
    validate: isStringArray,
  });
  const toggle = (id: string) =>
    setCompleted((previous) =>
      previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id],
    );
  return { completed, toggle, reset };
}
