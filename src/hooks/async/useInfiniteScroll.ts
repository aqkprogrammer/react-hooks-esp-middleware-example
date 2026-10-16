import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { noop } from '../internal/env';
import { useLatest } from '../state/useLatest';

export interface UseInfiniteScrollOptions {
  /** Loads the next page. Return a promise so the hook knows when loading finished. */
  loadMore: () => Promise<unknown> | void;
  /** `false` once the last page has loaded. */
  hasMore: boolean;
  /** Your own loading flag, if `loadMore` does not return a promise. */
  isLoading?: boolean;
  /** Start loading before the sentinel is visible. Default `'200px'`. */
  rootMargin?: string;
  /** Scroll container; default the viewport. */
  root?: Element | null;
  /** Default `true`. */
  enabled?: boolean;
}

export interface UseInfiniteScrollResult {
  /** Attach to an element placed after the last item (a callback ref). */
  sentinelRef: (element: Element | null) => void;
  /** A `loadMore` started by the hook (or `isLoading`) is still running. */
  isLoading: boolean;
  /** `false` without `IntersectionObserver` (and on the server) — render a "Load more" button. */
  isSupported: boolean;
}

const isThenable = (value: unknown): value is PromiseLike<unknown> =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { then?: unknown }).then === 'function';

const subscribeNothing = () => noop;
const getSupported = () => typeof IntersectionObserver !== 'undefined';
const getServerSupported = () => false;

/**
 * Calls `loadMore` when a sentinel element scrolls into view, with guards
 * that make duplicate loads impossible:
 *
 * - no call while `hasMore` is `false`, `isLoading` is `true`, or a promise
 *   returned by a previous `loadMore` is still pending;
 * - the observer is disconnected while loading and re-created afterwards. A
 *   fresh observer reports the sentinel's *current* intersection, so if the
 *   new page did not fill the screen the next page loads too (a plain
 *   observer would not fire again because nothing "changed").
 *
 * ```tsx
 * const { sentinelRef, isSupported } = useInfiniteScroll({ loadMore, hasMore });
 * <ul>{items.map(…)}</ul>
 * <div ref={sentinelRef} />
 * {!isSupported && <button onClick={loadMore}>Load more</button>}
 * ```
 *
 * Accessibility: infinite scroll traps keyboard users before the footer and
 * gives screen-reader users no sense of progress. Also render a visible
 * "Load more" button and announce new items in a polite live region.
 */
export function useInfiniteScroll(options: UseInfiniteScrollOptions): UseInfiniteScrollResult {
  const {
    loadMore,
    hasMore,
    isLoading = false,
    rootMargin = '200px',
    root = null,
    enabled = true,
  } = options;
  const loadMoreRef = useLatest(loadMore);
  const [element, setElement] = useState<Element | null>(null);
  const [internalLoading, setInternalLoading] = useState(false);
  const isSupported = useSyncExternalStore(subscribeNothing, getSupported, getServerSupported);
  // Synchronous guard: two intersection callbacks can arrive before React re-renders.
  const loadingRef = useRef(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const canLoad = enabled && hasMore && !isLoading && !internalLoading;

  useEffect(() => {
    if (!element || !canLoad || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting) || loadingRef.current) return;
        const result = loadMoreRef.current();
        if (!isThenable(result)) return;
        loadingRef.current = true;
        setInternalLoading(true);
        observer.disconnect();
        const done = () => {
          loadingRef.current = false;
          // Checks the component, not this effect run: the effect is cleaned
          // up as soon as loading starts (canLoad turns false).
          if (mountedRef.current) setInternalLoading(false);
        };
        result.then(done, done);
      },
      { root, rootMargin },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [element, canLoad, root, rootMargin, loadMoreRef]);

  const sentinelRef = useCallback((node: Element | null) => setElement(node), []);

  return { sentinelRef, isLoading: isLoading || internalLoading, isSupported };
}
