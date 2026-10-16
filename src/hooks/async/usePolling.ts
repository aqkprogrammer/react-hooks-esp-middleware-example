import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { isBrowser, noop, toError } from '../internal/env';
import { useLatest } from '../state/useLatest';

export interface UsePollingOptions {
  /** Time between the end of one request and the start of the next, in ms. */
  intervalMs: number;
  /** Default `true`. When `false`, polling stops and any request in flight is aborted. */
  enabled?: boolean;
  /** Stop while the tab is hidden and poll immediately when it becomes visible. Default `true`. */
  pauseWhenHidden?: boolean;
}

export interface UsePollingResult<T> {
  /** Latest successful result (kept while later polls fail). */
  data: T | undefined;
  /** Error of the most recent poll, cleared by the next success. */
  error: Error | undefined;
  /** A request is in flight. */
  isFetching: boolean;
  /** `enabled` but paused because the document is hidden. */
  isPaused: boolean;
  /** `Date.now()` of the last success, for "updated 5 s ago" labels. */
  updatedAt: number | undefined;
  /** Polls now and restarts the interval (aborting a request in flight). Stable. */
  refresh: () => void;
}

function subscribeVisibility(onChange: () => void) {
  if (!isBrowser) return noop;
  document.addEventListener('visibilitychange', onChange);
  return () => document.removeEventListener('visibilitychange', onChange);
}
const getHidden = () => document.visibilityState === 'hidden';
const getServerHidden = () => false;

interface PollState<T> {
  data: T | undefined;
  error: Error | undefined;
  updatedAt: number | undefined;
  inFlight: boolean;
}

/**
 * Calls `fn` immediately and then every `intervalMs` **after the previous
 * call settles** — a `setTimeout` chain, not `setInterval`, so a slow server
 * never causes overlapping requests.
 *
 * ```tsx
 * const stats = usePolling((signal) => fetchJson<Stats>('/api/stats', { signal }), { intervalMs: 2000 });
 * ```
 *
 * - Pauses while `document.visibilityState === 'hidden'` (background tabs,
 *   minimised windows) and polls immediately when the page is visible again.
 * - Unmount, `enabled: false`, hiding the page or `refresh()` abort the
 *   request in flight and clear the timer.
 * - The latest `fn` is used; changing it does not restart polling.
 *
 * SSR: does nothing on the server (`isPaused` is `false`, no data).
 */
export function usePolling<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  options: UsePollingOptions,
): UsePollingResult<T> {
  const { intervalMs, enabled = true, pauseWhenHidden = true } = options;
  const fnRef = useLatest(fn);
  const hidden = useSyncExternalStore(subscribeVisibility, getHidden, getServerHidden);
  const paused = pauseWhenHidden && hidden;
  const active = enabled && !paused;
  const [restartCount, setRestartCount] = useState(0);
  const [state, setState] = useState<PollState<T>>({
    data: undefined,
    error: undefined,
    updatedAt: undefined,
    inFlight: false,
  });

  useEffect(() => {
    if (!active) return;
    let controller: AbortController | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;

    const poll = () => {
      controller = new AbortController();
      const { signal } = controller;
      setState((previous) => ({ ...previous, inFlight: true }));
      Promise.resolve()
        .then(() => fnRef.current(signal))
        .then(
          (data) => {
            if (signal.aborted) return;
            setState({ data, error: undefined, updatedAt: Date.now(), inFlight: false });
          },
          (error: unknown) => {
            if (signal.aborted) return;
            setState((previous) => ({ ...previous, error: toError(error), inFlight: false }));
          },
        )
        .finally(() => {
          if (!stopped && !signal.aborted) timer = setTimeout(poll, Math.max(0, intervalMs));
        });
    };

    // Start asynchronously so the effect body itself never sets state.
    timer = setTimeout(poll, 0);
    return () => {
      stopped = true;
      clearTimeout(timer);
      controller?.abort();
    };
  }, [active, intervalMs, restartCount, fnRef]);

  const refresh = useCallback(() => setRestartCount((count) => count + 1), []);

  return {
    data: state.data,
    error: state.error,
    // An aborted request never clears `inFlight`, so only trust it while active.
    isFetching: active && state.inFlight,
    isPaused: enabled && paused,
    updatedAt: state.updatedAt,
    refresh,
  };
}
