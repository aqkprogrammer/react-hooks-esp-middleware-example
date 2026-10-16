import { useEffect } from 'react';
import { isBrowser } from '../internal/env';
import { useLatest } from '../state/useLatest';
import { resolveElement, useIsSupported, type ElementTarget } from './shared';

export interface UseResizeObserverOptions {
  /**
   * Which box to observe: `'content-box'` (default), `'border-box'` or
   * `'device-pixel-content-box'` (Chromium/Firefox; Safari ignores it and
   * observes the content box).
   */
  box?: ResizeObserverBoxOptions;
  /** Set to `false` to stop observing. Default `true`. */
  enabled?: boolean;
}

export interface UseResizeObserverResult {
  /** `false` on the server, during hydration and in browsers without `ResizeObserver`. */
  isSupported: boolean;
}

const supportsResizeObserver = () => isBrowser && typeof window.ResizeObserver === 'function';

/**
 * Calls `callback` whenever `target`'s size changes — the element, not the
 * window. Resizes caused by content, CSS, fonts loading or a parent's layout
 * are all reported, which `window.resize` cannot do.
 *
 * - `target`: an element, a ref (read when the effect runs) or `null`.
 * - The latest `callback` is used; changing it does not re-observe.
 * - The browser delivers an initial entry right after observing.
 * - The observer is disconnected on unmount or when target/box change.
 *
 * Callbacks run after layout and before paint, so updating state in them is
 * fine. If that state changes the observed element's size again in the same
 * frame, browsers report "ResizeObserver loop completed with undelivered
 * notifications" — harmless, but a sign of a layout feedback loop.
 */
export function useResizeObserver<T extends Element = Element>(
  target: ElementTarget<T>,
  callback: (entry: ResizeObserverEntry) => void,
  options: UseResizeObserverOptions = {},
): UseResizeObserverResult {
  const { box = 'content-box', enabled = true } = options;
  const isSupported = useIsSupported(supportsResizeObserver);
  const callbackRef = useLatest(callback);

  useEffect(() => {
    const element = resolveElement(target);
    if (!element || !enabled || !supportsResizeObserver()) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === element) callbackRef.current(entry);
      }
    });
    observer.observe(element, { box });
    return () => observer.disconnect();
  }, [target, box, enabled, callbackRef]);

  return { isSupported };
}
