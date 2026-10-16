import { useMemo, useState } from 'react';

export interface UseSetActions<T> {
  add: (value: T) => void;
  remove: (value: T) => void;
  /** Adds the value when absent, removes it when present. `force` picks the outcome. */
  toggle: (value: T, force?: boolean) => void;
  clear: () => void;
  /** Back to the initial values from the first render. */
  reset: () => void;
}

export type UseSetReturn<T> = readonly [set: ReadonlySet<T>, actions: UseSetActions<T>];

/**
 * A `Set` in state with immutable updates.
 *
 * React only re-renders when state is a *new* object, so every change copies
 * the set (`new Set(previous)`) and mutating the returned set is prevented at
 * the type level (`ReadonlySet`). No-op changes (adding a present value,
 * removing an absent one, clearing an empty set) keep the previous instance,
 * so React bails out of the re-render.
 *
 * Membership uses the SameValueZero semantics of `Set`: objects are compared
 * by reference. Copying is O(n) per update — fine for UI-sized sets.
 */
export function useSet<T>(initialValues?: Iterable<T> | (() => Iterable<T>)): UseSetReturn<T> {
  const [initial] = useState<ReadonlySet<T>>(() => {
    const source = typeof initialValues === 'function' ? initialValues() : initialValues;
    return new Set(source);
  });
  const [set, setSet] = useState<ReadonlySet<T>>(initial);

  const actions = useMemo<UseSetActions<T>>(() => {
    const toggle = (value: T, force?: boolean) =>
      setSet((previous) => {
        const shouldHave = force ?? !previous.has(value);
        if (shouldHave === previous.has(value)) return previous;
        const next = new Set(previous);
        if (shouldHave) next.add(value);
        else next.delete(value);
        return next;
      });
    return {
      add: (value) => toggle(value, true),
      remove: (value) => toggle(value, false),
      toggle,
      clear: () => setSet((previous) => (previous.size ? new Set<T>() : previous)),
      reset: () => setSet(initial),
    };
  }, [initial]);

  return [set, actions] as const;
}
