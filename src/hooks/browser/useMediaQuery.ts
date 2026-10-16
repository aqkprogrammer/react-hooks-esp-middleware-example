import { useCallback, useSyncExternalStore } from 'react';
import { isBrowser, noop } from '../internal/env';

export interface UseMediaQueryOptions {
  /** Value used on the server and in browsers without `matchMedia`. Default `false`. */
  defaultValue?: boolean;
}

const supportsMatchMedia = () => isBrowser && typeof window.matchMedia === 'function';

/**
 * Tracks whether a CSS media query matches, e.g. `useMediaQuery('(min-width: 768px)')`.
 *
 * Built on `useSyncExternalStore`, so every component reading the same query
 * sees the same value in the same render (no tearing) and there is no
 * "flash" from an effect-based update after mount.
 *
 * During SSR/hydration the `defaultValue` is used, then React re-renders with
 * the real value — avoiding hydration mismatches.
 */
export function useMediaQuery(query: string, options: UseMediaQueryOptions = {}): boolean {
  const { defaultValue = false } = options;

  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!supportsMatchMedia()) return noop;
      const list = window.matchMedia(query);
      // Safari < 14 only implements the deprecated addListener API.
      if (typeof list.addEventListener === 'function') {
        list.addEventListener('change', onChange);
        return () => list.removeEventListener('change', onChange);
      }
      list.addListener(onChange);
      return () => list.removeListener(onChange);
    },
    [query],
  );

  const getSnapshot = () =>
    supportsMatchMedia() ? window.matchMedia(query).matches : defaultValue;
  const getServerSnapshot = () => defaultValue;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
