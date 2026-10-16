import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react';
import { useIsomorphicLayoutEffect } from '../internal/useIsomorphicLayoutEffect';
import { useLatest } from './useLatest';

export interface UseControllableStateOptions<T> {
  /** The controlled value. `undefined` means "uncontrolled". */
  value?: T | undefined;
  /** The initial value while uncontrolled. */
  defaultValue: T;
  /** Called with the next value whenever it changes (in both modes). */
  onChange?: ((value: T) => void) | undefined;
  /** Component name used in the development warning. */
  name?: string;
}

export type UseControllableStateReturn<T> = readonly [
  value: T,
  setValue: (next: SetStateAction<T>) => void,
];

/**
 * Lets a component be **controlled** (the parent owns the value through
 * `value` + `onChange`) or **uncontrolled** (it keeps its own state, seeded by
 * `defaultValue`) — the pattern used by native inputs and Radix UI.
 *
 * - `setValue` resolves updaters against the current value, does nothing when
 *   the result is `Object.is`-equal, otherwise calls `onChange`; in
 *   uncontrolled mode it also updates the internal state.
 * - In controlled mode the parent may reject a change by not updating
 *   `value`; consecutive updaters in one event all see the same prop value
 *   until the parent re-renders.
 * - In development it warns once when a component switches between modes;
 *   the internal state is *not* synced with the last controlled value.
 * - `setValue` is stable. `T` must not be a function type (updaters).
 */
export function useControllableState<T>(
  options: UseControllableStateOptions<T>,
): UseControllableStateReturn<T> {
  const { value: controlledValue, defaultValue, onChange, name } = options;
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const value = isControlled ? controlledValue : internalValue;

  // The committed value. Event handlers also write it in uncontrolled mode so
  // that several updates in one event build on each other.
  const valueRef = useRef(value);
  useIsomorphicLayoutEffect(() => {
    valueRef.current = value;
  });
  const onChangeRef = useLatest(onChange);
  const isControlledRef = useLatest(isControlled);

  const [wasControlled] = useState(isControlled);
  const warnedRef = useRef(false);
  useEffect(() => {
    if (!import.meta.env.DEV || warnedRef.current || wasControlled === isControlled) return;
    warnedRef.current = true;
    const from = wasControlled ? 'controlled' : 'uncontrolled';
    const to = isControlled ? 'controlled' : 'uncontrolled';
    console.warn(
      `${name ?? 'A component'} is changing from ${from} to ${to}. Decide between using a ` +
        'controlled or uncontrolled value for the lifetime of the component ' +
        '(`value={undefined}` makes it uncontrolled; use `null` for "no value").',
    );
  }, [isControlled, wasControlled, name]);

  const setValue = useCallback(
    (next: SetStateAction<T>) => {
      const previous = valueRef.current;
      const resolved = typeof next === 'function' ? (next as (previous: T) => T)(previous) : next;
      if (Object.is(previous, resolved)) return;
      if (!isControlledRef.current) {
        valueRef.current = resolved;
        setInternalValue(() => resolved);
      }
      onChangeRef.current?.(resolved);
    },
    [isControlledRef, onChangeRef],
  );

  return [value, setValue] as const;
}
