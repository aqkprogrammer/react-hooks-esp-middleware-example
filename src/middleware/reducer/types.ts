/**
 * Dispatch middleware for React reducers — the same contract as Redux
 * middleware, so the mental model transfers both ways.
 *
 *   middleware = (api) => (next) => (action) => { ...; next(action); ... }
 *
 * - `api.getState()` returns the store's current state, *synchronously*
 *   updated after `next(action)` reaches the reducer.
 * - `api.dispatch(action)` re-enters the *whole* chain (use it for follow-up
 *   actions, e.g. `LOGIN_SUCCESS` after an async request).
 * - `next(action)` passes the action to the next middleware / the reducer.
 *   Not calling `next` swallows the action (validation, ESP routing, ...).
 */
export type Dispatch<A> = (action: A) => void;

export type Reducer<S, A> = (state: S, action: A) => S;

export interface MiddlewareAPI<S, A> {
  getState: () => S;
  dispatch: Dispatch<A>;
}

export type Middleware<S, A> = (api: MiddlewareAPI<S, A>) => (next: Dispatch<A>) => Dispatch<A>;

/** A minimal action shape used by examples; middleware may be generic over any action type. */
export interface AnyAction {
  type: string;
  payload?: unknown;
}
