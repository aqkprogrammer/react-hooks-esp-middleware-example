import { useCallback, useEffect, useRef, useState } from 'react';
import { toError } from '../internal/env';
import { useLatest } from '../state/useLatest';
import type { AsyncState } from './useAsync';

/**
 * What `execute()` resolves with. It never rejects, so
 * `onClick={() => execute()}` cannot cause an unhandled rejection.
 * - `aborted`: superseded by a newer call, cancelled, or the component unmounted.
 */
export type AsyncFnOutcome<T> =
  { status: 'success'; data: T } | { status: 'error'; error: Error } | { status: 'aborted' };

export type UseAsyncFnResult<T, Args extends unknown[]> = AsyncState<T> & {
  /** Starts a call, aborting any call in flight ("latest call wins"). Stable identity. */
  execute: (...args: Args) => Promise<AsyncFnOutcome<T>>;
  /** Aborts the call in flight and returns to the previous settled state (or `idle`). Stable. */
  cancel: () => void;
  /** Aborts any call and resets to `idle`. Stable. */
  reset: () => void;
};

const IDLE = { status: 'idle', data: undefined, error: undefined } as const;

/**
 * Imperative counterpart of `useAsync`: nothing runs until you call
 * `execute(...args)` — for submits, mutations and user-triggered searches.
 *
 * ```tsx
 * const save = useAsyncFn((signal, todo: Draft) =>
 *   fetchJson<Todo>('/api/todos', { method: 'POST', body: JSON.stringify(todo), signal }),
 * );
 * <button onClick={() => save.execute(draft)} disabled={save.status === 'pending'}>Save</button>
 * ```
 *
 * - **Latest call wins:** each `execute` aborts the previous call's signal and
 *   ignores its result, so out-of-order responses cannot overwrite newer ones.
 * - `execute` returns a promise of an {@link AsyncFnOutcome} for callers that
 *   need the result (e.g. navigate after save). It never rejects.
 * - Unmounting aborts the call in flight; no state updates happen afterwards.
 * - `execute`, `cancel` and `reset` are stable; the latest `fn` is always used.
 *
 * Note: aborting stops the *client* from waiting. A POST that already reached
 * the server may still have been applied — make mutations idempotent.
 */
export function useAsyncFn<T, Args extends unknown[] = []>(
  fn: (signal: AbortSignal, ...args: Args) => Promise<T>,
): UseAsyncFnResult<T, Args> {
  const fnRef = useLatest(fn);
  const [state, setState] = useState<AsyncState<T>>(IDLE);
  const controllerRef = useRef<AbortController | null>(null);
  // The state to return to when a call is cancelled.
  const settledRef = useRef<AsyncState<T>>(IDLE);

  useEffect(
    () => () => {
      controllerRef.current?.abort();
      controllerRef.current = null;
    },
    [],
  );

  const execute = useCallback(
    async (...args: Args): Promise<AsyncFnOutcome<T>> => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setState((previous) => ({ status: 'pending', data: previous.data, error: undefined }));
      try {
        const data = await fnRef.current(controller.signal, ...args);
        if (controller.signal.aborted) return { status: 'aborted' };
        controllerRef.current = null;
        const next: AsyncState<T> = { status: 'success', data, error: undefined };
        settledRef.current = next;
        setState(next);
        return { status: 'success', data };
      } catch (thrown) {
        if (controller.signal.aborted) return { status: 'aborted' };
        controllerRef.current = null;
        const error = toError(thrown);
        const next: AsyncState<T> = { status: 'error', data: settledRef.current.data, error };
        settledRef.current = next;
        setState(next);
        return { status: 'error', error };
      }
    },
    [fnRef],
  );

  const cancel = useCallback(() => {
    if (!controllerRef.current) return;
    controllerRef.current.abort();
    controllerRef.current = null;
    setState(settledRef.current);
  }, []);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    settledRef.current = IDLE;
    setState(IDLE);
  }, []);

  return { ...state, execute, cancel, reset };
}
