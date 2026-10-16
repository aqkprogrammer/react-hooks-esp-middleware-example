import { applyMiddleware } from './compose';
import type { Dispatch, Middleware, Reducer } from './types';

export interface ReducerStore<S, A> {
  getState: () => S;
  dispatch: Dispatch<A>;
  subscribe: (listener: () => void) => () => void;
}

/**
 * A tiny external store: a reducer, a listener set and a middleware chain.
 *
 * Running the reducer outside React (instead of inside `useReducer`) is what
 * lets middleware call `getState()` after `next(action)` and see the *new*
 * state synchronously — something a `useReducer`-based chain cannot offer,
 * because React applies queued updates during its next render.
 */
export function createReducerStore<S, A>(
  reducer: Reducer<S, A>,
  initialState: S,
  middleware: ReadonlyArray<Middleware<S, A>> = [],
): ReducerStore<S, A> {
  let state = initialState;
  const listeners = new Set<() => void>();

  const reduce: Dispatch<A> = (action) => {
    const nextState = reducer(state, action);
    if (Object.is(nextState, state)) return;
    state = nextState;
    listeners.forEach((listener) => listener());
  };

  let dispatchThroughChain: Dispatch<A> = () => {
    throw new Error('Dispatching while constructing middleware is not allowed.');
  };
  const api = {
    getState: () => state,
    dispatch: (action: A) => dispatchThroughChain(action),
  };
  dispatchThroughChain = applyMiddleware(middleware, api, reduce);

  return {
    getState: api.getState,
    dispatch: api.dispatch,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
