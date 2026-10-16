import { useState, useSyncExternalStore } from 'react';
import { createReducerStore, type ReducerStore } from './createReducerStore';
import type { Dispatch, Middleware, Reducer } from './types';

/**
 * `useReducer` with a Redux-style middleware chain.
 *
 * ```ts
 * const [state, dispatch] = useReducerWithMiddleware(reducer, initialState, [logger, persist]);
 * ```
 *
 * - `dispatch` is stable for the component's lifetime (like `useReducer`).
 * - The reducer, initial state and middleware are captured on mount (like
 *   Redux's `createStore`); later changes to them are ignored. Define
 *   middleware at module level or create them once.
 * - Middleware run outside render, so they may perform side effects
 *   (logging, requests, storage). Reducers must still be pure.
 *
 * Returns the store as a third element for advanced cases (e.g. bridging the
 * store to an external event router).
 */
export function useReducerWithMiddleware<S, A>(
  reducer: Reducer<S, A>,
  initialState: S,
  middleware: ReadonlyArray<Middleware<S, A>> = [],
): readonly [state: S, dispatch: Dispatch<A>, store: ReducerStore<S, A>] {
  const [store] = useState(() => createReducerStore(reducer, initialState, middleware));
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);
  return [state, store.dispatch, store] as const;
}
