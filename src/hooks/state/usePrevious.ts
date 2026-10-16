import { useState } from 'react';

export interface UsePreviousOptions<T> {
  /**
   * Decides whether `value` changed. Defaults to `Object.is`. Pass a custom
   * comparison (e.g. by id) when the parent creates a new object on every
   * render but you only care about meaningful changes.
   */
  isEqual?: (previous: T, next: T) => boolean;
}

interface Tracked<T> {
  current: T;
  previous: T | undefined;
}

/**
 * Returns the previous **distinct** value of `value` — the value it had
 * before it last changed — or `undefined` until it changes for the first time.
 *
 * Why "previous distinct value" and not "value from the previous render"?
 * - Re-renders caused by unrelated state would otherwise overwrite the
 *   previous value with the current one, so `previous === current` most of
 *   the time — rarely what you want for "it went from 3 to 4" UIs.
 * - The render-based version needs a ref that is written during render (or
 *   read during render and written in an effect), which React's rules forbid:
 *   renders may be repeated or discarded in concurrent rendering and Strict
 *   Mode.
 *
 * Implementation: the "adjust state while rendering" pattern. When `value`
 * differs from the tracked one, the hook calls `setState` during render;
 * React immediately re-renders this component with the new state before
 * committing, so no extra commit or Effect is involved.
 *
 * Note: if `T` itself includes `undefined`, "no previous value yet" and "the
 * previous value was `undefined`" look the same.
 */
export function usePrevious<T>(value: T, options: UsePreviousOptions<T> = {}): T | undefined {
  const { isEqual = Object.is } = options;
  const [tracked, setTracked] = useState<Tracked<T>>({ current: value, previous: undefined });

  if (!isEqual(tracked.current, value)) {
    const next: Tracked<T> = { current: value, previous: tracked.current };
    setTracked(next);
    return next.previous;
  }
  return tracked.previous;
}
