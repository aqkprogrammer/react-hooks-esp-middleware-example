import { useEffect, useState } from 'react';
import { useDebouncedCallback } from './useDebouncedCallback';

export interface UseDebounceOptions {
  /** Publish the latest value at least this often while it keeps changing. */
  maxWait?: number;
}

/**
 * Returns `value`, but only after it has stopped changing for `delayMs`.
 *
 * Typical use: run an expensive filter or a request from the debounced value
 * of a text input while the input itself stays responsive.
 *
 * - The first render returns `value` immediately (nothing to wait for).
 * - If `value` returns to the published value before the delay expires, the
 *   trailing update publishes that same value and React bails out.
 * - Built on `useDebouncedCallback`; for leading-edge behaviour, `cancel` or
 *   `flush`, use that hook directly.
 */
export function useDebounce<T>(value: T, delayMs: number, options: UseDebounceOptions = {}): T {
  const [debounced, setDebounced] = useState(value);
  // Wrap in an updater so function values are stored, not called.
  const publish = useDebouncedCallback((next: T) => setDebounced(() => next), delayMs, {
    maxWait: options.maxWait,
  });

  useEffect(() => {
    // Nothing to do on mount, or after the value has been published. Otherwise
    // forward every change (even back to the published value) so the trailing
    // edge always publishes the latest value.
    if (Object.is(value, debounced) && !publish.isPending()) return;
    publish(value);
  }, [value, debounced, publish]);

  return debounced;
}
