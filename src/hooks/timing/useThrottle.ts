import { useEffect, useState } from 'react';
import { useThrottledCallback, type UseThrottledCallbackOptions } from './useThrottledCallback';

/**
 * Returns `value`, updated at most once every `intervalMs` while it keeps
 * changing — the first change is published immediately (leading edge) and
 * the latest value is published at the end of each interval (trailing edge).
 *
 * Use it for values that change continuously (scroll position, pointer
 * coordinates, a slider) when you want regular updates *during* the
 * activity; use `useDebounce` when you only care about the final value.
 *
 * The leading-edge update happens in an Effect, so it costs one extra render.
 */
export function useThrottle<T>(
  value: T,
  intervalMs: number,
  options: UseThrottledCallbackOptions = {},
): T {
  const [throttled, setThrottled] = useState(value);
  const publish = useThrottledCallback((next: T) => setThrottled(() => next), intervalMs, options);

  useEffect(() => {
    // Nothing to do on mount, or after the value has been published. Otherwise
    // forward every change (even back to the published value) so the trailing
    // edge always publishes the latest value.
    if (Object.is(value, throttled) && !publish.isPending()) return;
    publish(value);
  }, [value, throttled, publish]);

  return throttled;
}
