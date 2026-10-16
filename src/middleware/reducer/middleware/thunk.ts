import type { Dispatch, Middleware } from '../types';

/**
 * A function dispatched instead of an action. It receives the store's
 * `dispatch` (which accepts actions *and* thunks) and `getState`, plus an
 * optional extra argument (an API client, a clock, ...) injected at setup.
 *
 * The return value is ignored: the core `Dispatch` type returns `void`, so
 * callers cannot await a thunk. Report the outcome by dispatching actions
 * (`*_SUCCESS` / `*_FAILURE`), which is also what keeps it visible to other
 * middleware.
 */
export type Thunk<S, A, Extra = undefined> = (
  dispatch: Dispatch<ThunkActionOf<S, A, Extra>>,
  getState: () => S,
  extra: Extra,
) => unknown;

/** The action type of a store that accepts plain actions `A` and thunks. */
export type ThunkActionOf<S, A, Extra = undefined> = A | Thunk<S, A, Extra>;

/**
 * Type guard separating thunks from plain actions. Plain actions must
 * therefore never be functions themselves.
 */
export function isThunk<S, A, Extra>(
  action: ThunkActionOf<S, A, Extra>,
): action is Thunk<S, A, Extra> {
  return typeof action === 'function';
}

/**
 * Lets the store dispatch functions: `dispatch((dispatch, getState) => ...)`.
 *
 * The thunk runs immediately and is **not** passed on, so later middleware and
 * the reducer only ever see plain actions — which is why `thunk` normally
 * comes early in the chain. Everything the thunk dispatches re-enters the
 * *whole* chain via `api.dispatch`.
 *
 * Async thunks must catch their own errors and dispatch a failure action: a
 * rejected promise happens after `dispatch` returned, so no middleware (not
 * even error reporting) can catch it.
 *
 * ```ts
 * type CartAction = { type: 'loaded'; items: Item[] } | { type: 'failed'; message: string };
 * type CartDispatchable = ThunkActionOf<CartState, CartAction>;
 * const middleware: Middleware<CartState, CartDispatchable>[] = [createThunkMiddleware()];
 * ```
 */
export function createThunkMiddleware<S, A>(): Middleware<S, ThunkActionOf<S, A>>;
export function createThunkMiddleware<S, A, Extra>(
  extra: Extra,
): Middleware<S, ThunkActionOf<S, A, Extra>>;
export function createThunkMiddleware<S, A, Extra>(
  extra?: Extra,
): Middleware<S, ThunkActionOf<S, A, Extra>> {
  return (api) => (next) => (action) => {
    if (isThunk(action)) {
      // `extra` is `undefined` exactly when the overload without it was used,
      // in which case `Extra` is `undefined`.
      action(api.dispatch, api.getState, extra as Extra);
      return;
    }
    next(action);
  };
}
