import { useEffect } from 'react';
import { useLatest } from '../state/useLatest';

/**
 * Declarative `setInterval` (Dan Abramov's pattern):
 *
 * - The **latest** `callback` runs on every tick; changing it does not restart
 *   the interval, so it can read fresh props and state.
 * - Changing `delayMs` restarts the interval with the new delay.
 * - `null` pauses it. The interval is cleared on unmount.
 *
 * Intervals are throttled in background tabs (often to once per second or
 * less) and drift; use timestamps (`Date.now()`) for elapsed-time displays.
 */
export function useInterval(callback: () => void, delayMs: number | null): void {
  const callbackRef = useLatest(callback);
  useEffect(() => {
    if (delayMs === null) return;
    const id = setInterval(() => callbackRef.current(), Math.max(0, delayMs));
    return () => clearInterval(id);
  }, [delayMs, callbackRef]);
}
