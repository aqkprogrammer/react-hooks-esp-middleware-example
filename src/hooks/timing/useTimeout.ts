import { useEffect, useMemo, useState } from 'react';
import { useLatest } from '../state/useLatest';

export interface UseTimeoutOptions {
  /** Start on mount and whenever `delayMs` changes. Default `true`. */
  autoStart?: boolean;
}

export interface UseTimeoutReturn {
  /** Whether the timer is running (reactive). */
  isPending: boolean;
  /** Starts the timer if it is not already running. */
  start: () => void;
  /** Restarts the timer from now, whether or not it was running. */
  reset: () => void;
  /** Cancels the timer. */
  clear: () => void;
}

interface TimeoutState {
  pending: boolean;
  /** Bumped on every (re)start so the Effect schedules a fresh timer. */
  run: number;
  delay: number | null;
}

/**
 * Declarative `setTimeout` with controls.
 *
 * The timer is described by state (`pending` + a run counter) and scheduled
 * by an Effect, so it is always cleared on unmount, restarted when `delayMs`
 * changes, and never fires twice. The latest `callback` is called.
 *
 * - `delayMs = null` disables the timer (and clears a pending one).
 * - Changing `delayMs` restarts a pending timer with the new delay; with
 *   `autoStart` it also starts an idle one.
 * - `start`/`reset`/`clear` are stable. They take effect after React
 *   re-renders (timers start a few ms later than the call, not earlier).
 */
export function useTimeout(
  callback: () => void,
  delayMs: number | null,
  options: UseTimeoutOptions = {},
): UseTimeoutReturn {
  const { autoStart = true } = options;
  const callbackRef = useLatest(callback);
  const [state, setState] = useState<TimeoutState>(() => ({
    pending: autoStart && delayMs !== null,
    run: 0,
    delay: delayMs,
  }));

  // "Adjust state while rendering" when the delay prop changes.
  let current = state;
  if (!Object.is(state.delay, delayMs)) {
    current = {
      ...state,
      pending: delayMs !== null && (state.pending || autoStart),
      delay: delayMs,
    };
    setState(current);
  }
  const { pending, run } = current;

  useEffect(() => {
    if (!pending || delayMs === null) return;
    const id = setTimeout(
      () => {
        setState((previous) => (previous.run === run ? { ...previous, pending: false } : previous));
        callbackRef.current();
      },
      Math.max(0, delayMs),
    );
    return () => clearTimeout(id);
  }, [pending, run, delayMs, callbackRef]);

  const controls = useMemo(
    () => ({
      start: () =>
        setState((previous) =>
          previous.pending || previous.delay === null
            ? previous
            : { ...previous, pending: true, run: previous.run + 1 },
        ),
      reset: () =>
        setState((previous) =>
          previous.delay === null
            ? previous
            : { ...previous, pending: true, run: previous.run + 1 },
        ),
      clear: () =>
        setState((previous) => (previous.pending ? { ...previous, pending: false } : previous)),
    }),
    [],
  );

  return { isPending: pending && delayMs !== null, ...controls };
}
