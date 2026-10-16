import { useStorageState, type StorageStateOptions, type StorageStateResult } from './storageState';

/**
 * `useState` that persists to `localStorage` and stays in sync across every
 * component *and* every tab using the same key.
 *
 * ```tsx
 * const [theme, setTheme, resetTheme] = useLocalStorage<'light' | 'dark'>('theme', 'light');
 * ```
 *
 * - SSR-safe: renders `initialValue` on the server and during hydration.
 * - Survives unavailable storage (falls back to memory and reports `unavailable`).
 * - Never throws for corrupt JSON or quota errors; use `onError` to observe them.
 *
 * Security: anything in localStorage is readable by any script on the origin
 * (including injected XSS payloads). Never store tokens, secrets or personal data.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T | (() => T),
  options?: StorageStateOptions<T>,
): StorageStateResult<T> {
  return useStorageState('local', key, initialValue, options);
}
