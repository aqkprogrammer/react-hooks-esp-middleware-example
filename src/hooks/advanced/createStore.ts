export type ExternalStoreListener<T> = (state: T, previousState: T) => void;

/** A partial object, or an updater computing one from the current state. */
export type StatePatch<T> = Partial<T> | ((state: T) => Partial<T>);

export interface ExternalStore<T extends object> {
  getState: () => T;
  /** The state the store was created with (handy for "reset"). */
  getInitialState: () => T;
  /**
   * Shallow-merges `patch` into the state (or replaces it when `replace` is
   * `true`) and notifies subscribers synchronously. Returning the current
   * state from an updater is a no-op: nobody is notified.
   */
  setState: {
    (patch: StatePatch<T>, replace?: false): void;
    (next: T | ((state: T) => T), replace: true): void;
  };
  /** Adds a listener and returns a function that removes it. */
  subscribe: (listener: ExternalStoreListener<T>) => () => void;
}

/** `createStore((set, get) => ({ count: 0, increment: () => set(s => ({ count: s.count + 1 })) }))` */
export type StateInitializer<T extends object> = (
  setState: ExternalStore<T>['setState'],
  getState: () => T,
) => T;

/**
 * A minimal external store: the same core as Zustand's vanilla `createStore`
 * (~30 lines), written out for teaching.
 *
 * State lives *outside* React, so it can be read and written from anywhere
 * (event handlers, websockets, tests). Components read it with
 * `useExternalStore(store, selector)`, which re-renders only when the selected
 * slice changes.
 *
 * Treat the state as immutable: always produce a new object; never mutate
 * `getState()` in place, or subscribers will not notice the change.
 */
export function createStore<T extends object>(initial: T | StateInitializer<T>): ExternalStore<T> {
  const listeners = new Set<ExternalStoreListener<T>>();
  let state: T;

  const getState = () => state;

  const setState = ((
    patchOrNext: StatePatch<T> | T | ((current: T) => T),
    replace?: boolean,
  ): void => {
    const computed =
      typeof patchOrNext === 'function'
        ? (patchOrNext as (current: T) => Partial<T> | T)(state)
        : patchOrNext;
    if (Object.is(computed, state)) return;
    const previous = state;
    state = replace ? (computed as T) : { ...state, ...computed };
    for (const listener of [...listeners]) listener(state, previous);
  }) as ExternalStore<T>['setState'];

  const subscribe = (listener: ExternalStoreListener<T>) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  state =
    typeof initial === 'function' ? (initial as StateInitializer<T>)(setState, getState) : initial;
  const initialState = state;

  return { getState, getInitialState: () => initialState, setState, subscribe };
}
