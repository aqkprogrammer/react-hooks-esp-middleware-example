import { useCallback, useEffect, useState, type DependencyList } from 'react';
import { toError } from '../internal/env';
import { useLatest } from '../state/useLatest';

/**
 * The lifecycle of one async operation as a discriminated union: narrow on
 * `status` and TypeScript knows whether `data`/`error` are present.
 *
 * `pending` and `error` may carry `data` from an earlier success (see
 * `keepPreviousData` in {@link UseAsyncOptions}).
 */
export type AsyncState<T> =
  | { status: 'idle'; data: undefined; error: undefined }
  | { status: 'pending'; data: T | undefined; error: undefined }
  | { status: 'success'; data: T; error: undefined }
  | { status: 'error'; data: T | undefined; error: Error };

export type AsyncStatus = AsyncState<unknown>['status'];

export type UseAsyncResult<T> = AsyncState<T> & {
  /** Runs the function again with the current dependencies (aborting any run in flight). */
  reload: () => void;
};

export interface UseAsyncOptions {
  /** When `false` nothing runs, any run in flight is aborted and the status is `idle`. Default `true`. */
  enabled?: boolean;
  /**
   * Keep the last successful `data` while a new run is pending (handy for
   * pagination). Default `false`, so a pending run never shows data that
   * belongs to different inputs.
   */
  keepPreviousData?: boolean;
}

type Settled<T> =
  | { version: number; status: 'success'; data: T; error: undefined }
  | { version: number; status: 'error'; data: T | undefined; error: Error };

interface Tracked {
  deps: DependencyList;
  enabled: boolean;
  version: number;
}

function depsChanged(previous: DependencyList, next: DependencyList): boolean {
  return previous.length !== next.length || previous.some((dep, i) => !Object.is(dep, next[i]));
}

/**
 * Runs a promise-returning function whenever `deps` change and exposes its
 * lifecycle as an {@link AsyncState}.
 *
 * ```tsx
 * const user = useAsync((signal) => fetchJson<User>(`/api/users/${id}`, { signal }), [id]);
 * if (user.status === 'success') return <p>{user.data.name}</p>;
 * ```
 *
 * - **Cancellation:** `fn` receives an `AbortSignal` that is aborted when the
 *   deps change, `reload()` is called, `enabled` turns off or the component
 *   unmounts. Pass it to `fetch`.
 * - **No stale results:** a run whose signal was aborted can never update
 *   state, even if `fn` ignores the signal — so fast input changes cannot show
 *   an older response ("last deps win").
 * - **No extra render:** `pending` is derived during render from the deps,
 *   not set inside an effect, so the first render after a change is already
 *   `pending`.
 * - `fn` may be an inline function: the latest one is called, and only `deps`
 *   decide when to re-run. List every value `fn` reads in `deps`.
 *
 * SSR: effects do not run on the server, so the server renders `pending`
 * (or `idle` when disabled). Fetch on the server with your framework instead.
 */
export function useAsync<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  deps: DependencyList,
  options: UseAsyncOptions = {},
): UseAsyncResult<T> {
  const { enabled = true, keepPreviousData = false } = options;
  const fnRef = useLatest(fn);

  // "Adjusting state when a prop changes" (react.dev): compare deps during
  // render and bump a version. The version drives the effect below.
  const [tracked, setTracked] = useState<Tracked>({ deps, enabled, version: 0 });
  let version = tracked.version;
  if (tracked.enabled !== enabled || depsChanged(tracked.deps, deps)) {
    version = tracked.version + 1;
    setTracked({ deps, enabled, version });
  }

  const [settled, setSettled] = useState<Settled<T> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    let promise: Promise<T>;
    try {
      promise = Promise.resolve(fnRef.current(controller.signal));
    } catch (error) {
      promise = Promise.reject(error);
    }
    promise.then(
      (data) => {
        if (controller.signal.aborted) return;
        setSettled({ version, status: 'success', data, error: undefined });
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setSettled((previous) => ({
          version,
          status: 'error',
          data: previous?.data,
          error: toError(error),
        }));
      },
    );
    return () => controller.abort();
  }, [version, enabled, fnRef]);

  const reload = useCallback(() => {
    setTracked((previous) => ({ ...previous, version: previous.version + 1 }));
  }, []);

  let state: AsyncState<T>;
  if (!enabled) {
    state = { status: 'idle', data: undefined, error: undefined };
  } else if (settled && settled.version === version) {
    const { version: _version, ...rest } = settled;
    state = rest;
  } else {
    state = {
      status: 'pending',
      data: keepPreviousData ? settled?.data : undefined,
      error: undefined,
    };
  }
  return { ...state, reload };
}
