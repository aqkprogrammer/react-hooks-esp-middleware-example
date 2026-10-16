import { use } from 'react';

export interface ResourceCache<T> {
  /** Returns the cached promise for `key`, calling `load` only on a miss. */
  read: (key: string, load: (key: string) => Promise<T>) => Promise<T>;
  /** Drops one key (or everything) so the next read loads again — e.g. to retry after an error. */
  invalidate: (key?: string) => void;
  has: (key: string) => boolean;
}

export interface ResourceCacheOptions {
  /** Least-recently-read entries beyond this are dropped. Default `100`. */
  maxEntries?: number;
}

/**
 * A promise cache keyed by string: the missing piece for `use(promise)`.
 *
 * `use` needs the **same promise object** on every render; a promise created
 * during render is new each time and would suspend forever. Create the cache
 * at module level (or in a context), never inside a component.
 *
 * Rejected promises stay cached — so an error boundary shows the error
 * instead of refetching in a loop — until you `invalidate(key)`.
 */
export function createResourceCache<T>(options: ResourceCacheOptions = {}): ResourceCache<T> {
  const { maxEntries = 100 } = options;
  const promises = new Map<string, Promise<T>>();
  return {
    read(key, load) {
      const cached = promises.get(key);
      if (cached) {
        // Re-insert to mark as most recently used.
        promises.delete(key);
        promises.set(key, cached);
        return cached;
      }
      const promise = load(key);
      promises.set(key, promise);
      while (promises.size > Math.max(1, maxEntries)) {
        const oldest = promises.keys().next().value;
        if (oldest === undefined) break;
        promises.delete(oldest);
      }
      return promise;
    },
    invalidate(key) {
      if (key === undefined) promises.clear();
      else promises.delete(key);
    },
    has: (key) => promises.has(key),
  };
}

/**
 * Reads `key` from a {@link ResourceCache} with React 19's `use`, suspending
 * until the data is ready and throwing errors to the nearest error boundary.
 *
 * ```tsx
 * const products = createResourceCache<Product>();
 * function ProductCard({ id }: { id: number }) {
 *   const product = useResource(products, String(id), () => fetchJson(`/api/products/${id}`));
 *   return <h3>{product.name}</h3>;
 * }
 * // <ErrorBoundary><Suspense fallback={<Spinner />}><ProductCard id={1} /></Suspense></ErrorBoundary>
 * ```
 *
 * **A teaching tool.** It shows what Suspense data fetching needs (a stable
 * promise per key), but a real cache also needs invalidation on mutations,
 * expiry, request deduplication across a server render and hydration, and
 * abort. Frameworks (Next.js, React Router loaders) and libraries
 * (TanStack Query's `useSuspenseQuery`, SWR's `suspense` option) own that.
 *
 * The loader gets no `AbortSignal`: the promise is shared by every component
 * reading the key, so no single unmount may cancel it.
 */
export function useResource<T>(
  cache: ResourceCache<T>,
  key: string,
  load: (key: string) => Promise<T>,
): T {
  return use(cache.read(key, load));
}
