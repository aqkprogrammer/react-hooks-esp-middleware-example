import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { noop, toError } from '../internal/env';
import { useLatest } from '../state/useLatest';

/** Immutable snapshot of one key. A new object is stored on every change. */
export interface RequestCacheEntry {
  data: unknown;
  error: Error | undefined;
  /** `Date.now()` of the last successful fetch or `mutate`; `0` if never. */
  updatedAt: number;
  isValidating: boolean;
}

export interface RequestCache {
  get: (key: string) => RequestCacheEntry | undefined;
  subscribe: (key: string, listener: () => void) => () => void;
  /**
   * Fetches `key`, sharing a request already in flight (deduplication). A
   * request that started *before* the latest `mutate` is not shared, and its
   * response is discarded so it cannot overwrite the newer local value.
   */
  revalidate: (key: string, fetcher: (key: string) => Promise<unknown>) => Promise<void>;
  /** Writes data locally (optimistic update) and notifies every subscriber. */
  mutate: (key: string, update: (current: unknown) => unknown) => void;
  /** Number of fetches started per key — for demos and tests. */
  fetchCount: (key: string) => number;
  clear: () => void;
}

/**
 * Creates an isolated cache for {@link useRequest}. Use one per app (module
 * level) and a fresh one per test. Entries are never garbage-collected.
 */
export function createRequestCache(): RequestCache {
  const entries = new Map<string, RequestCacheEntry>();
  const listeners = new Map<string, Set<() => void>>();
  const inflight = new Map<string, { promise: Promise<void>; startedAt: number }>();
  const mutatedAt = new Map<string, number>();
  const counts = new Map<string, number>();
  // A logical clock orders requests and mutations without relying on Date.now() resolution.
  let clock = 0;

  const empty: RequestCacheEntry = {
    data: undefined,
    error: undefined,
    updatedAt: 0,
    isValidating: false,
  };

  const set = (key: string, patch: Partial<RequestCacheEntry>) => {
    entries.set(key, { ...(entries.get(key) ?? empty), ...patch });
    listeners.get(key)?.forEach((listener) => listener());
  };

  return {
    get: (key) => entries.get(key),
    subscribe(key, listener) {
      const set = listeners.get(key) ?? new Set();
      listeners.set(key, set);
      set.add(listener);
      return () => {
        set.delete(listener);
        if (set.size === 0) listeners.delete(key);
      };
    },
    revalidate(key, fetcher) {
      const running = inflight.get(key);
      if (running && running.startedAt > (mutatedAt.get(key) ?? 0)) return running.promise;

      clock += 1;
      const startedAt = clock;
      counts.set(key, (counts.get(key) ?? 0) + 1);
      set(key, { isValidating: true });
      const promise = Promise.resolve()
        .then(() => fetcher(key))
        .then(
          (data) => {
            if ((mutatedAt.get(key) ?? 0) > startedAt) return; // superseded by mutate
            set(key, { data, error: undefined, updatedAt: Date.now() });
          },
          (error: unknown) => {
            if ((mutatedAt.get(key) ?? 0) > startedAt) return;
            set(key, { error: toError(error) });
          },
        )
        .finally(() => {
          if (inflight.get(key)?.promise !== promise) return;
          inflight.delete(key);
          set(key, { isValidating: false });
        });
      inflight.set(key, { promise, startedAt });
      return promise;
    },
    mutate(key, update) {
      clock += 1;
      mutatedAt.set(key, clock);
      const current = entries.get(key)?.data;
      set(key, { data: update(current), error: undefined, updatedAt: Date.now() });
    },
    fetchCount: (key) => counts.get(key) ?? 0,
    clear() {
      entries.clear();
      inflight.clear();
      mutatedAt.clear();
      counts.clear();
      listeners.forEach((set) => set.forEach((listener) => listener()));
    },
  };
}

const defaultCache = createRequestCache();

export interface UseRequestOptions {
  /** Defaults to a module-level cache shared by the whole app. */
  cache?: RequestCache;
  /**
   * Data younger than this is fresh: mounting another component with the same
   * key does not refetch. Older data is shown immediately *and* revalidated
   * (stale-while-revalidate). Default `2000`.
   */
  staleTimeMs?: number;
}

export interface MutateOptions {
  /** Refetch after writing the local value (default `true`). */
  revalidate?: boolean;
}

export interface UseRequestResult<T> {
  /** Cached data — possibly stale while `isValidating`. */
  data: T | undefined;
  /** Error of the last fetch. Earlier `data` is kept. */
  error: Error | undefined;
  /** No data and no error yet: show a skeleton. */
  isLoading: boolean;
  /** A request for this key is in flight (also true when refreshing data you already show). */
  isValidating: boolean;
  /** Refetches now, sharing a request already in flight. Stable per key. */
  revalidate: () => Promise<void>;
  /** Updates the cached value for every subscriber, then revalidates. Stable per key. */
  mutate: (next: T | ((current: T | undefined) => T), options?: MutateOptions) => Promise<void>;
}

/**
 * A deliberately small stale-while-revalidate cache, to show how SWR and
 * TanStack Query work inside — it is **not** a replacement for them.
 *
 * ```tsx
 * const todos = useRequest('/api/todos', (url) => fetchJson<Todo[]>(url));
 * todos.mutate((list = []) => [...list, draft]); // optimistic, then revalidates
 * ```
 *
 * What it adds over `useFetch`:
 * - **Shared cache by key:** every component using the key reads one entry
 *   via `useSyncExternalStore`, so they always agree.
 * - **Deduplication:** concurrent mounts share one in-flight request.
 * - **Stale-while-revalidate:** cached data renders instantly; it is
 *   refetched in the background when older than `staleTimeMs`.
 * - **mutate:** optimistic local writes; an older in-flight response cannot
 *   overwrite them.
 *
 * Not included (use a library): garbage collection, retries, refetch on
 * focus/reconnect, pagination, SSR hydration, devtools. Requests are shared,
 * so they are not aborted on unmount; the result simply lands in the cache.
 * `key` must uniquely identify the data *and* its type. `null` skips fetching.
 */
export function useRequest<T>(
  key: string | null,
  fetcher: (key: string) => Promise<T>,
  options: UseRequestOptions = {},
): UseRequestResult<T> {
  const { cache = defaultCache, staleTimeMs = 2000 } = options;
  const fetcherRef = useLatest(fetcher);

  const subscribe = useCallback(
    (onChange: () => void) => (key === null ? noop : cache.subscribe(key, onChange)),
    [cache, key],
  );
  const entry = useSyncExternalStore(
    subscribe,
    () => (key === null ? undefined : cache.get(key)),
    // Never read a shared module cache on the server: it would leak data between requests.
    () => undefined,
  );

  useEffect(() => {
    if (key === null) return;
    const current = cache.get(key);
    const fresh = current && !current.error && Date.now() - current.updatedAt < staleTimeMs;
    if (!fresh) void cache.revalidate(key, (k) => fetcherRef.current(k));
  }, [cache, key, staleTimeMs, fetcherRef]);

  const revalidate = useCallback(
    () => (key === null ? Promise.resolve() : cache.revalidate(key, (k) => fetcherRef.current(k))),
    [cache, key, fetcherRef],
  );

  const mutate = useCallback<UseRequestResult<T>['mutate']>(
    (next, mutateOptions = {}) => {
      if (key === null) return Promise.resolve();
      cache.mutate(key, (current) =>
        typeof next === 'function'
          ? (next as (current: T | undefined) => T)(current as T | undefined)
          : next,
      );
      return mutateOptions.revalidate === false ? Promise.resolve() : revalidate();
    },
    [cache, key, revalidate],
  );

  const data = entry?.data as T | undefined;
  const error = entry?.error;
  return {
    data,
    error,
    isLoading: key !== null && data === undefined && error === undefined,
    isValidating: entry?.isValidating ?? false,
    revalidate,
    mutate,
  };
}
