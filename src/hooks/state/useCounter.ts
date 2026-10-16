import { useMemo, useState } from 'react';

export interface UseCounterOptions {
  /** Lower bound (inclusive). Default `-Infinity`. */
  min?: number;
  /** Upper bound (inclusive). Default `Infinity`. */
  max?: number;
  /** Amount used by `increment`/`decrement`. Default `1`. */
  step?: number;
}

export interface UseCounterReturn {
  /** Current value, always within `[min, max]`. */
  count: number;
  increment: () => void;
  decrement: () => void;
  /** Sets a value (or applies an updater); the result is clamped. `NaN` is ignored. */
  set: (next: number | ((previous: number) => number)) => void;
  /** Back to the (clamped) initial value from the first render. */
  reset: () => void;
  isAtMin: boolean;
  isAtMax: boolean;
}

const clampTo = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * A number with optional `min`/`max` bounds and a `step`.
 *
 * - Every update is clamped, and the rendered `count` is clamped too, so
 *   narrowing the bounds later never shows an out-of-range value.
 * - Updates use functional `setState`, so several calls in one event add up.
 * - `increment`/`decrement` take no arguments (safe as `onClick={increment}`);
 *   use `set((n) => n + 10)` for arbitrary amounts.
 * - Actions are stable while `min`, `max` and `step` stay the same.
 *
 * Throws a `RangeError` when `min > max` — a programming error.
 */
export function useCounter(initialValue = 0, options: UseCounterOptions = {}): UseCounterReturn {
  const { min = -Infinity, max = Infinity, step = 1 } = options;
  if (min > max) throw new RangeError(`useCounter: min (${min}) must be <= max (${max}).`);

  const [initial] = useState(initialValue);
  const [raw, setRaw] = useState(() => clampTo(initialValue, min, max));
  const count = clampTo(raw, min, max);

  const actions = useMemo(() => {
    const update = (compute: (current: number) => number) =>
      setRaw((previous) => {
        const next = compute(clampTo(previous, min, max));
        return Number.isNaN(next) ? previous : clampTo(next, min, max);
      });
    return {
      increment: () => update((current) => current + step),
      decrement: () => update((current) => current - step),
      set: (next: number | ((previous: number) => number)) =>
        update((current) => (typeof next === 'function' ? next(current) : next)),
      reset: () => setRaw(clampTo(initial, min, max)),
    };
  }, [min, max, step, initial]);

  return { count, ...actions, isAtMin: count <= min, isAtMax: count >= max };
}
