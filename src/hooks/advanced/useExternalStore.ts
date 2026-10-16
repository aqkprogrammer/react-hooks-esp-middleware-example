import { useMemo, useSyncExternalStore } from 'react';
import type { ExternalStore } from './createStore';

export type SelectionEqualityFn<U> = (previous: U, next: U) => boolean;

const identity = <T>(state: T): T => state;

/**
 * Shallow equality for objects and arrays: same keys, `Object.is`-equal
 * values. Use it when a selector returns a new object/array every time,
 * e.g. `(s) => ({ a: s.a, b: s.b })` or `(s) => s.items.filter(...)`.
 */
export function shallowEqualObjects<U>(previous: U, next: U): boolean {
  if (Object.is(previous, next)) return true;
  if (
    typeof previous !== 'object' ||
    typeof next !== 'object' ||
    previous === null ||
    next === null ||
    Array.isArray(previous) !== Array.isArray(next)
  ) {
    return false;
  }
  const previousKeys = Object.keys(previous);
  if (previousKeys.length !== Object.keys(next).length) return false;
  return previousKeys.every(
    (key) =>
      Object.prototype.hasOwnProperty.call(next, key) &&
      Object.is((previous as Record<string, unknown>)[key], (next as Record<string, unknown>)[key]),
  );
}

/**
 * Builds a `getSnapshot` for `useSyncExternalStore` that memoises the last
 * `(state, selection)` pair, so the same reference is returned while the
 * selection is unchanged. (React's own `useSyncExternalStoreWithSelector`
 * shim works the same way.)
 */
function createSelectionSnapshot<T extends object, U>(
  store: ExternalStore<T>,
  selector: (state: T) => U,
  equalityFn: SelectionEqualityFn<U>,
): () => U {
  let memo: { state: T; selection: U } | null = null;
  return () => {
    const state = store.getState();
    if (memo && Object.is(memo.state, state)) return memo.selection;
    const next = selector(state);
    const selection = memo && equalityFn(memo.selection, next) ? memo.selection : next;
    memo = { state, selection };
    return selection;
  };
}

/**
 * Subscribes a component to a slice of a `createStore` store.
 *
 * The component re-renders **only when the selected value changes** (by
 * `Object.is`, or by `equalityFn`, e.g. `shallowEqualObjects`). Updates to other
 * parts of the state are ignored — this is what makes external stores scale
 * better than a single context value.
 *
 * Built on `useSyncExternalStore`, so it is tear-free in concurrent rendering
 * and SSR-safe (the server renders the store's current state; create stores
 * per request on the server if they hold user data).
 *
 * How the "no re-render" part works: `getSnapshot` memoises the last
 * `(state, selection)` pair. If the state object did not change, the previous
 * selection is returned; if it did but `equalityFn` says the selection is
 * equal, the *previous reference* is returned. `useSyncExternalStore` compares
 * snapshots with `Object.is`, sees no change, and skips the render.
 */
export function useExternalStore<T extends object>(store: ExternalStore<T>): T;
export function useExternalStore<T extends object, U>(
  store: ExternalStore<T>,
  selector: (state: T) => U,
  equalityFn?: SelectionEqualityFn<U>,
): U;

export function useExternalStore<T extends object, U>(
  store: ExternalStore<T>,
  selector: (state: T) => U = identity as (state: T) => U,
  equalityFn: SelectionEqualityFn<U> = Object.is,
): U {
  const getSnapshot = useMemo(
    () => createSelectionSnapshot(store, selector, equalityFn),
    [store, selector, equalityFn],
  );

  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}
