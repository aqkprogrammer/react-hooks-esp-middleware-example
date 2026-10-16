import { useEffect, useState } from 'react';
import { useIsomorphicLayoutEffect } from '../internal/useIsomorphicLayoutEffect';
import { createDebouncer, type DebounceSettings } from './debouncer';

export interface UseDebouncedCallbackOptions {
  /** Invoke on the first call of a burst. Default `false`. */
  leading?: boolean;
  /** Invoke after the burst with the latest arguments. Default `true`. */
  trailing?: boolean;
  /**
   * Maximum time (ms) a call may be postponed while calls keep coming.
   * Without it, a never-ending burst never invokes. Clamped to `>= delayMs`.
   */
  maxWait?: number;
}

/** A debounced function with control methods. Its identity is stable. */
export interface DebouncedFunction<Args extends unknown[]> {
  (...args: Args): void;
  /** Drop the pending invocation, if any. */
  cancel: () => void;
  /** Run the pending invocation now, if any. */
  flush: () => void;
  /** Whether a trailing invocation is scheduled (not reactive — read it in handlers/effects). */
  isPending: () => boolean;
}

/**
 * Returns a debounced version of `callback`: it runs once calls stop for
 * `delayMs` (trailing edge), and optionally on the leading edge and at least
 * every `maxWait` ms.
 *
 * - **Stable identity**: the returned function never changes, so it is safe in
 *   dependency arrays and memoized children.
 * - **No stale closures**: it always invokes the callback from the latest
 *   render, with the arguments of the latest call.
 * - **Option changes** (delay, maxWait, edges) apply immediately: a pending
 *   call is re-evaluated against the new settings, measured from the last call.
 * - **Cleanup**: on unmount the pending call is cancelled and later calls are
 *   ignored, so the callback never runs after unmount. Call `flush()` from
 *   your own cleanup if pending work must be saved instead.
 */
export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs: number,
  options: UseDebouncedCallbackOptions = {},
): DebouncedFunction<Args> {
  const { leading = false, trailing = true, maxWait } = options;
  const settings: DebounceSettings = { wait: delayMs, leading, trailing, maxWait };

  // Created once. The engine holds the latest callback/settings itself (see
  // the layout effect below), so no ref is read during render.
  const [{ debounced, debouncer }] = useState(() => {
    const engine = createDebouncer<Args>(callback, settings);
    const fn: DebouncedFunction<Args> = Object.assign((...args: Args) => engine.call(...args), {
      cancel: engine.cancel,
      flush: engine.flush,
      isPending: engine.isPending,
    });
    return { debounced: fn, debouncer: engine };
  });

  // After every commit: use the newest callback (no stale closures) and
  // re-evaluate a pending call if the delay or edges changed.
  useIsomorphicLayoutEffect(() => {
    debouncer.configure(callback, { wait: delayMs, leading, trailing, maxWait });
  });

  useEffect(() => {
    debouncer.setEnabled(true);
    return () => debouncer.setEnabled(false);
  }, [debouncer]);

  return debounced;
}
