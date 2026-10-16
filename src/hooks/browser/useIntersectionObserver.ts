import { useCallback, useEffect, useState } from 'react';
import { isBrowser } from '../internal/env';
import { useLatest } from '../state/useLatest';
import { useIsSupported } from './shared';

export interface UseIntersectionObserverOptions {
  /** Visibility ratio(s) in `[0, 1]` at which to report changes. Default `0`. */
  threshold?: number | readonly number[];
  /**
   * Scroll container used as the viewport; `null`/omitted = the browser
   * viewport. Pass the element itself (e.g. from a callback ref in state).
   */
  root?: Element | Document | null;
  /** CSS-margin-like grow/shrink of the root box, e.g. `'200px 0px'` to preload early. */
  rootMargin?: string;
  /** Stop observing after the first time the element becomes visible (lazy loading, "seen" analytics). */
  freezeOnceVisible?: boolean;
  /**
   * Reported before the first observation, on the server and when
   * `IntersectionObserver` is unsupported. Use `true` for lazy content so it
   * still shows up in old browsers. Default `false`.
   */
  initialIsIntersecting?: boolean;
  /** Set to `false` to stop observing. Default `true`. */
  enabled?: boolean;
  /** Called with every entry for the observed element. */
  onChange?: (entry: IntersectionObserverEntry) => void;
}

export interface UseIntersectionObserverResult<T extends Element> {
  /** Callback ref for the element to observe. */
  ref: (node: T | null) => void;
  isIntersecting: boolean;
  /** The latest entry for the current element, or `null` before the first one. */
  entry: IntersectionObserverEntry | null;
  /** `false` on the server, during hydration and in browsers without the API. */
  isSupported: boolean;
}

const supportsIntersectionObserver = () =>
  isBrowser && typeof window.IntersectionObserver === 'function';

/**
 * Observes whether an element is visible inside the viewport (or a `root`
 * scroll container), using `IntersectionObserver` — no scroll listeners, no
 * layout reads on the main thread.
 *
 * ```tsx
 * const { ref, isIntersecting } = useIntersectionObserver<HTMLDivElement>({ threshold: 0.5 });
 * ```
 *
 * One observer is created per hook and disconnected on unmount, when the
 * element changes, when options change, or once frozen.
 */
export function useIntersectionObserver<T extends Element = HTMLElement>(
  options: UseIntersectionObserverOptions = {},
): UseIntersectionObserverResult<T> {
  const {
    threshold = 0,
    root = null,
    rootMargin = '0px',
    freezeOnceVisible = false,
    initialIsIntersecting = false,
    enabled = true,
    onChange,
  } = options;
  const isSupported = useIsSupported(supportsIntersectionObserver);
  const onChangeRef = useLatest(onChange);
  const [element, setElement] = useState<T | null>(null);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);

  // An entry for a previous element is meaningless for the current one.
  const currentEntry = entry !== null && entry.target === element ? entry : null;
  const frozen = freezeOnceVisible && currentEntry?.isIntersecting === true;
  // Primitive key so `threshold={[0, 0.5, 1]}` literals do not re-observe every render.
  const thresholdKey = Array.isArray(threshold) ? threshold.join(',') : String(threshold);

  useEffect(() => {
    if (!element || !enabled || frozen || !supportsIntersectionObserver()) return;
    const observer = new IntersectionObserver(
      (entries) => {
        // Several entries can be queued for the same element; the last is newest.
        const latest = entries.filter((item) => item.target === element).at(-1);
        if (!latest) return;
        setEntry(latest);
        onChangeRef.current?.(latest);
      },
      { root, rootMargin, threshold: thresholdKey.split(',').map(Number) },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [element, enabled, frozen, root, rootMargin, thresholdKey, onChangeRef]);

  const ref = useCallback((node: T | null) => setElement(node), []);
  return {
    ref,
    isIntersecting: currentEntry ? currentEntry.isIntersecting : initialIsIntersecting,
    entry: currentEntry,
    isSupported,
  };
}
