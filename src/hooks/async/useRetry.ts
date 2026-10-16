import { useCallback, useEffect, useRef, useState } from 'react';
import { toError } from '../internal/env';
import { useLatest } from '../state/useLatest';
import { computeBackoff, sleep, type BackoffOptions } from './backoff';
import { isTransientError } from './errors';
import type { AsyncFnOutcome } from './useAsyncFn';

export type RetryState<T> =
  | { status: 'idle'; attempt: 0; data: undefined; error: undefined; nextRetryInMs: undefined }
  | {
      status: 'pending';
      attempt: number;
      data: undefined;
      error: Error | undefined;
      nextRetryInMs: undefined;
    }
  /** Attempt `attempt` failed; the next one starts in `nextRetryInMs`. */
  | { status: 'waiting'; attempt: number; data: undefined; error: Error; nextRetryInMs: number }
  | { status: 'success'; attempt: number; data: T; error: undefined; nextRetryInMs: undefined }
  /** Gave up: attempts exhausted or the error is not retryable. */
  | { status: 'error'; attempt: number; data: undefined; error: Error; nextRetryInMs: undefined };

export interface RetryEvent {
  error: Error;
  /** The attempt that failed (1-based). */
  attempt: number;
  /** Delay before the next attempt. */
  delayMs: number;
}

export interface UseRetryOptions extends BackoffOptions {
  /** Total attempts including the first. Default `3`. */
  maxAttempts?: number;
  /**
   * Whether a failure should be retried. Default {@link isTransientError}:
   * network errors, timeouts, 408, 429 and 5xx. Never called for aborts.
   */
  shouldRetry?: (error: Error, attempt: number) => boolean;
  /** Called before waiting for each retry — log or report it. */
  onRetry?: (event: RetryEvent) => void;
}

export type UseRetryResult<T> = RetryState<T> & {
  /** Starts from attempt 1, aborting any run in flight. Never rejects. Stable. */
  run: () => Promise<AsyncFnOutcome<T>>;
  /** Aborts the current attempt or wait and returns to `idle`. Stable. */
  cancel: () => void;
};

const IDLE = {
  status: 'idle',
  attempt: 0,
  data: undefined,
  error: undefined,
  nextRetryInMs: undefined,
} as const;

/**
 * Runs `fn` with automatic retries using exponential backoff with jitter.
 *
 * ```tsx
 * const report = useRetry((signal) => fetchJson<Report>('/api/report', { signal }), {
 *   maxAttempts: 4,
 * });
 * <button onClick={report.run}>Load</button>
 * ```
 *
 * - `fn(signal, attempt)` gets one `AbortSignal` for the whole run; `cancel()`,
 *   a new `run()` or unmounting aborts the current attempt *and* the pending
 *   backoff timer, so nothing fires later.
 * - Only transient errors are retried by default — retrying a 400 or 401 just
 *   repeats the same failure. Customise with `shouldRetry`.
 * - Delays come from {@link computeBackoff}; jitter prevents many clients
 *   retrying in lock-step after an outage ("thundering herd").
 *
 * Only retry idempotent operations (GET, PUT with the same body, or POSTs
 * carrying an idempotency key).
 */
export function useRetry<T>(
  fn: (signal: AbortSignal, attempt: number) => Promise<T>,
  options: UseRetryOptions = {},
): UseRetryResult<T> {
  const fnRef = useLatest(fn);
  const optionsRef = useLatest(options);
  const [state, setState] = useState<RetryState<T>>(IDLE);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      controllerRef.current?.abort();
      controllerRef.current = null;
    },
    [],
  );

  const run = useCallback(async (): Promise<AsyncFnOutcome<T>> => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    const { signal } = controller;
    controllerRef.current = controller;
    let lastError: Error | undefined;

    for (let attempt = 1; ; attempt += 1) {
      setState({
        status: 'pending',
        attempt,
        data: undefined,
        error: lastError,
        nextRetryInMs: undefined,
      });
      try {
        const data = await fnRef.current(signal, attempt);
        if (signal.aborted) return { status: 'aborted' };
        controllerRef.current = null;
        setState({ status: 'success', attempt, data, error: undefined, nextRetryInMs: undefined });
        return { status: 'success', data };
      } catch (thrown) {
        if (signal.aborted) return { status: 'aborted' };
        const error = toError(thrown);
        lastError = error;
        const {
          maxAttempts = 3,
          shouldRetry = isTransientError,
          onRetry,
          ...backoff
        } = optionsRef.current;
        if (attempt >= maxAttempts || !shouldRetry(error, attempt)) {
          controllerRef.current = null;
          setState({ status: 'error', attempt, data: undefined, error, nextRetryInMs: undefined });
          return { status: 'error', error };
        }
        const delayMs = computeBackoff(attempt, backoff);
        onRetry?.({ error, attempt, delayMs });
        setState({ status: 'waiting', attempt, data: undefined, error, nextRetryInMs: delayMs });
        try {
          await sleep(delayMs, signal);
        } catch {
          return { status: 'aborted' };
        }
      }
    }
  }, [fnRef, optionsRef]);

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setState(IDLE);
  }, []);

  return { ...state, run, cancel };
}
