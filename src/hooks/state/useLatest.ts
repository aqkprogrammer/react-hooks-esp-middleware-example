import { useRef, type RefObject } from 'react';
import { useIsomorphicLayoutEffect } from '../internal/useIsomorphicLayoutEffect';

/**
 * Returns a ref that always holds the value from the latest committed render.
 *
 * Use it to read the newest props/callbacks from long-lived callbacks
 * (subscriptions, timers, event listeners) without re-subscribing every time
 * they change. The ref is updated in a layout effect, not during render, so
 * it never exposes values from a render that React later discards.
 *
 * Do not read `ref.current` during render — it is for callbacks only.
 */
export function useLatest<T>(value: T): RefObject<T> {
  const ref = useRef(value);
  useIsomorphicLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}
