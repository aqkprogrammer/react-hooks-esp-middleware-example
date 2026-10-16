import { useCallback, useMemo, useSyncExternalStore } from 'react';

/** Anything that can notify about changes and report its current value. */
export interface SubscriptionSource<T> {
  /** Registers `onChange` and returns an unsubscribe function. */
  subscribe: (onChange: () => void) => () => void;
  /** Synchronously returns the current value. */
  getCurrentValue: () => T;
  /**
   * Value for the server render and hydration. Defaults to `getCurrentValue`,
   * so provide it when `getCurrentValue` touches browser-only APIs.
   */
  getServerValue?: () => T;
}

export interface UseSubscriptionOptions<T> {
  /**
   * Treat a new value as unchanged when this returns `true`, keeping the
   * previous reference. Use it when `getCurrentValue` builds a new object or
   * array on every call (e.g. `{ ...state }`), which would otherwise make
   * React re-render forever. Default `Object.is`.
   */
  isEqual?: (previous: T, next: T) => boolean;
}

/** Returns the previous reference while `isEqual(previous, next)` holds. */
function createCachedSnapshot<T>(
  source: SubscriptionSource<T>,
  isEqual: (previous: T, next: T) => boolean,
): () => T {
  let cached: { value: T } | null = null;
  return () => {
    const next = source.getCurrentValue();
    if (cached && isEqual(cached.value, next)) return cached.value;
    cached = { value: next };
    return next;
  };
}

/**
 * Reads a value from any external, callback-based source and re-renders when
 * it changes — a thin, safer front-end for `useSyncExternalStore`.
 *
 * Compared with calling `useSyncExternalStore` directly it:
 * - accepts a source *object* (`{ subscribe, getCurrentValue }`), the shape
 *   used by the old `use-subscription` package that `useSyncExternalStore`
 *   replaced, so sources can be defined once and passed around;
 * - caches snapshots with `isEqual`, so sources that return fresh objects do
 *   not trigger the "getSnapshot should be cached" infinite loop.
 *
 * **Keep `source` and `isEqual` stable** (module level or `useMemo`): a new
 * source object on every render means unsubscribe + subscribe on every render.
 */
export function useSubscription<T>(
  source: SubscriptionSource<T>,
  options: UseSubscriptionOptions<T> = {},
): T {
  const { isEqual = Object.is } = options;

  // Call through `source` so class-based sources keep their `this`.
  const subscribe = useCallback((onChange: () => void) => source.subscribe(onChange), [source]);

  // One snapshot cache per (source, isEqual) pair.
  const getSnapshot = useMemo(() => createCachedSnapshot(source, isEqual), [source, isEqual]);

  const getServerSnapshot = () =>
    source.getServerValue ? source.getServerValue() : source.getCurrentValue();

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
