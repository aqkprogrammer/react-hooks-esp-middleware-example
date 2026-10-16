import { useCallback, useState } from 'react';
import { useLatest } from './useLatest';

/** `[value, toggle, setValue]` */
export type UseToggleReturn<T> = readonly [
  value: T,
  /** Advances to the next value, wrapping around. Ignores its arguments. */
  toggle: () => void,
  /** Jumps to one of the values. Values that are not in the list are ignored. */
  setValue: (value: T) => void,
];

const BOOLEAN_VALUES: readonly [false, true] = [false, true];

const indexOf = (values: readonly unknown[], value: unknown) =>
  values.findIndex((candidate) => Object.is(candidate, value));

/** Toggles a boolean: `const [on, toggle, setOn] = useToggle()`. */
export function useToggle(initialValue?: boolean): UseToggleReturn<boolean>;
/**
 * Cycles through a fixed list of values:
 * `const [theme, nextTheme] = useToggle(['light', 'dark', 'system'])`.
 * The `const` type parameter infers a literal union without `as const`.
 */
export function useToggle<const T extends readonly [unknown, unknown, ...unknown[]]>(
  values: T,
  initialValue?: T[number],
): UseToggleReturn<T[number]>;
/**
 * Cycles through two or more values (a boolean by default).
 *
 * The hook stores an **index**, so an inline array literal (a new array every
 * render) is fine. `toggle` is stable for a given list length; `setValue` is
 * always stable and compares with `Object.is`.
 */
export function useToggle(
  arg?: boolean | readonly unknown[],
  initialValue?: unknown,
): readonly [value: unknown, toggle: () => void, setValue: (value: never) => void] {
  const values: readonly unknown[] = typeof arg === 'object' ? arg : BOOLEAN_VALUES;
  const length = values.length;
  if (length < 2) throw new RangeError('useToggle needs at least two values to cycle through.');

  const [index, setIndex] = useState(() => {
    const start = typeof arg === 'object' ? initialValue : arg === true;
    const found = start === undefined ? 0 : indexOf(values, start);
    return found === -1 ? 0 : found;
  });

  const valuesRef = useLatest(values);

  const toggle = useCallback(() => setIndex((previous) => (previous + 1) % length), [length]);

  const setValue = useCallback(
    (value: unknown) => {
      const found = indexOf(valuesRef.current, value);
      if (found === -1) {
        if (import.meta.env.DEV) {
          console.warn('useToggle: ignoring a value that is not in the list of values.', value);
        }
        return;
      }
      setIndex(found);
    },
    [valuesRef],
  );

  return [values[index % length], toggle, setValue] as const;
}
