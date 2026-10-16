import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { isBrowser, noop } from '../internal/env';

export interface WindowSize {
  width: number;
  height: number;
}

export interface UseWindowSizeOptions {
  /**
   * Size reported on the server and during hydration. There is no way to know
   * the real size on the server; pick the layout you want the first paint to
   * use (often mobile-first). Default `0 × 0`.
   */
  serverSize?: WindowSize;
  /**
   * Re-render at most once per `throttleMs` while resizing (leading and
   * trailing edge). `0` (default) re-renders on every `resize` event.
   */
  throttleMs?: number;
}

// One cached snapshot shared by every consumer: getSnapshot must return the
// same object while the size is unchanged, or React re-renders forever.
let cached: WindowSize | null = null;

function getSnapshot(): WindowSize {
  const width = window.innerWidth;
  const height = window.innerHeight;
  if (!cached || cached.width !== width || cached.height !== height) cached = { width, height };
  return cached;
}

const DEFAULT_SERVER_SIZE: WindowSize = { width: 0, height: 0 };

/**
 * The viewport size (`window.innerWidth/innerHeight`, including scrollbars),
 * kept in sync through `useSyncExternalStore`.
 *
 * - Every component sees the same size in the same render (no tearing).
 * - SSR: `serverSize` is rendered on the server and during hydration, then
 *   React re-renders with the real size.
 * - `throttleMs` limits re-renders during drag-resizing; any render still reads
 *   the current size.
 *
 * For layout decisions prefer `useMediaQuery` (re-renders only when a
 * breakpoint is crossed) or CSS; use this hook when you need the numbers.
 */
export function useWindowSize(options: UseWindowSizeOptions = {}): WindowSize {
  const { serverSize = DEFAULT_SERVER_SIZE, throttleMs = 0 } = options;

  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!isBrowser) return noop;
      let timer: ReturnType<typeof setTimeout> | undefined;
      let pending = false;
      const listener = () => {
        if (throttleMs <= 0) return onChange();
        if (timer !== undefined) {
          pending = true;
          return;
        }
        onChange();
        const tick = () => {
          if (pending) {
            pending = false;
            onChange();
            timer = setTimeout(tick, throttleMs);
          } else {
            timer = undefined;
          }
        };
        timer = setTimeout(tick, throttleMs);
      };
      window.addEventListener('resize', listener, { passive: true });
      return () => {
        window.removeEventListener('resize', listener);
        if (timer !== undefined) clearTimeout(timer);
      };
    },
    [throttleMs],
  );

  // Stable server snapshot derived from primitives, so a new `serverSize`
  // literal each render is fine.
  const { width: serverWidth, height: serverHeight } = serverSize;
  const server = useMemo(
    () => ({ width: serverWidth, height: serverHeight }),
    [serverWidth, serverHeight],
  );
  const getServerSnapshot = useCallback(() => server, [server]);

  return useSyncExternalStore(
    subscribe,
    isBrowser ? getSnapshot : getServerSnapshot,
    getServerSnapshot,
  );
}
