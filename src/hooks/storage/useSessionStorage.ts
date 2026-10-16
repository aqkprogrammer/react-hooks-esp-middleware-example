import { useStorageState, type StorageStateOptions, type StorageStateResult } from './storageState';

/**
 * `useState` that persists to `sessionStorage`: the value survives reloads
 * of *this tab* but is discarded when the tab is closed, and each tab has its
 * own copy.
 *
 * ```tsx
 * const [step, setStep] = useSessionStorage('checkout:step', 1);
 * ```
 *
 * Same contract as `useLocalStorage` (SSR-safe, validated reads, quota and
 * availability errors via `onError`, in-memory fallback). Components in the
 * same tab stay in sync. Other tabs never see the value — sessionStorage is
 * per tab — except that "Duplicate tab" copies it once.
 *
 * Security: readable by any script on the origin (XSS) for as long as the
 * tab lives. Shorter-lived than localStorage, but still no place for tokens
 * or secrets.
 */
export function useSessionStorage<T>(
  key: string,
  initialValue: T | (() => T),
  options?: StorageStateOptions<T>,
): StorageStateResult<T> {
  return useStorageState('session', key, initialValue, options);
}
