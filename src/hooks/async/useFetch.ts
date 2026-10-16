import { fetchJson } from './fetchJson';
import { useAsync, type UseAsyncOptions, type UseAsyncResult } from './useAsync';

export interface UseFetchOptions<T> extends UseAsyncOptions {
  /** Passed to `fetch`. Its `signal` is ignored — the hook manages cancellation. */
  init?: Omit<RequestInit, 'signal'>;
  /** Turns the response into data. Defaults to JSON (a type assertion, not validation). */
  parse?: (response: Response) => Promise<T>;
  /** Abort after this many ms; the state becomes `error` with a `TimeoutError`. */
  timeoutMs?: number;
}

/**
 * A stable identity for "the same request". Inline `init` objects are new on
 * every render, so compare what actually changes the request instead.
 */
function requestKey(url: string | null, init: RequestInit | undefined, timeoutMs?: number) {
  const headers = init?.headers ? [...new Headers(init.headers).entries()] : [];
  const body = typeof init?.body === 'string' ? init.body : null;
  return JSON.stringify([
    url,
    init?.method ?? 'GET',
    headers,
    body,
    init?.credentials ?? null,
    init?.cache ?? null,
    timeoutMs ?? null,
  ]);
}

/**
 * Declarative `fetch` built on {@link useAsync}: fetches `url` on mount and
 * whenever the request changes, and exposes `idle | pending | success | error`.
 *
 * ```tsx
 * const user = useFetch<User>(id ? `/api/users/${id}` : null, { timeoutMs: 5000 });
 * ```
 *
 * - Pass `null` as the URL to skip fetching (status `idle`).
 * - The previous request is **aborted** when the URL, method, headers, a
 *   string body or `timeoutMs` change, and on unmount; its response can never
 *   overwrite newer data.
 * - Non-2xx responses become an `HttpError` (with `status` and parsed `body`),
 *   timeouts a `TimeoutError`, network failures the `TypeError` from `fetch`.
 * - New `init`/`parse` identities alone do not refetch; call `reload()`.
 *
 * This is deliberately *not* a cache: two components fetching the same URL
 * make two requests. For server state in production use TanStack Query, SWR
 * or your framework's data loader.
 */
export function useFetch<T = unknown>(
  url: string | null,
  options: UseFetchOptions<T> = {},
): UseAsyncResult<T> {
  const { init, parse, timeoutMs, enabled = true, keepPreviousData } = options;
  return useAsync<T>(
    (signal) => {
      if (url === null) return Promise.reject(new Error('useFetch: no URL'));
      return fetchJson<T>(url, { ...init, signal, timeoutMs, parse });
    },
    [requestKey(url, init, timeoutMs)],
    { enabled: enabled && url !== null, keepPreviousData },
  );
}
