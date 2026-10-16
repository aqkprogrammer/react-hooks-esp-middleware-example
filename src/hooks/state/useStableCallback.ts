import { useCallback, useInsertionEffect, useRef } from 'react';

/**
 * Returns a function whose identity never changes but which always calls the
 * `callback` from the latest committed render.
 *
 * Use it for event handlers passed to memoized children (`React.memo`) or
 * to hooks that would otherwise re-subscribe when a handler changes.
 *
 * - **Do not call it during render**: it calls the callback from the *last
 *   commit*, which may be stale while rendering. It is for events, timers
 *   and effects.
 * - **Inside Effects on React 19.2+**, prefer the built-in `useEffectEvent`,
 *   which the linter understands.
 * - The latest callback is stored in an insertion effect, which runs before
 *   any layout effect, so child layout effects already see the new callback.
 */
export function useStableCallback<Args extends unknown[], Result>(
  callback: (...args: Args) => Result,
): (...args: Args) => Result {
  const callbackRef = useRef(callback);
  useInsertionEffect(() => {
    callbackRef.current = callback;
  });
  return useCallback((...args: Args) => callbackRef.current(...args), []);
}
