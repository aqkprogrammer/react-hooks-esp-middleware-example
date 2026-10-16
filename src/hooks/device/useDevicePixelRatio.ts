import { useSyncExternalStore } from 'react';
import { isBrowser, noop } from '../internal/env';

export interface UseDevicePixelRatioOptions {
  /** Value rendered on the server and during hydration. Default `1`. */
  defaultValue?: number;
}

/**
 * Subscribes to changes of `window.devicePixelRatio`.
 *
 * There is no `devicepixelratiochange` event. The standard trick (from MDN) is
 * to watch a media query for the *current* ratio, `(resolution: 2dppx)`: it
 * stops matching — and fires `change` — when the user zooms or drags the
 * window to a monitor with a different density. The listener then has to be
 * moved to a new query for the new ratio, which is what `listen()` does.
 *
 * Browsers without `matchMedia` fall back to the `resize` event, which most
 * of them fire on zoom.
 */
function subscribe(onChange: () => void): () => void {
  if (!isBrowser) return noop;

  if (typeof window.matchMedia !== 'function') {
    window.addEventListener('resize', onChange);
    return () => window.removeEventListener('resize', onChange);
  }

  let unlisten = noop;
  const listen = () => {
    const list = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    const handle = () => {
      unlisten();
      listen();
      onChange();
    };
    if (typeof list.addEventListener === 'function') {
      list.addEventListener('change', handle);
      unlisten = () => list.removeEventListener('change', handle);
    } else {
      // Safari < 14 only implements the deprecated listener API.
      list.addListener(handle);
      unlisten = () => list.removeListener(handle);
    }
  };
  listen();
  return () => unlisten();
}

/**
 * Returns `window.devicePixelRatio` and re-renders when it changes (browser
 * zoom, moving the window between a standard and a HiDPI display).
 *
 * Useful for sizing `<canvas>` backing stores and picking image densities.
 * SSR-safe: renders `defaultValue` (1) on the server and during hydration.
 */
export function useDevicePixelRatio(options: UseDevicePixelRatioOptions = {}): number {
  const { defaultValue = 1 } = options;
  const getSnapshot = () =>
    isBrowser && window.devicePixelRatio > 0 ? window.devicePixelRatio : defaultValue;
  return useSyncExternalStore(subscribe, getSnapshot, () => defaultValue);
}
