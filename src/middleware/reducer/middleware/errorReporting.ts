import type { Middleware } from '../types';

export interface ErrorReport<S, A> {
  error: unknown;
  /** The action whose processing threw. */
  action: A;
  /** State at the time of the failure (unchanged: a throwing reducer commits nothing). */
  state: S;
}

export interface ErrorReportingOptions<S, A> {
  /** Sends the report (Sentry, a logging endpoint, the on-screen log, ...). */
  report: (report: ErrorReport<S, A>) => void;
  /**
   * Optionally turns the error into an action (e.g. `{ type: 'ERROR', message }`)
   * so the UI can show it. Dispatched through the whole chain.
   */
  toAction?: (error: unknown, action: A) => A | null | undefined;
  /** Re-throw after reporting, so the caller still sees the failure. Default `false`. */
  rethrow?: boolean;
}

/**
 * Catches errors thrown *synchronously* by every later middleware and by the
 * reducer, reports them and (optionally) dispatches an error action instead
 * of letting the exception escape into the event handler that dispatched.
 *
 * Put it **first** in the chain: it can only see what runs inside its
 * `next(action)`. It cannot see errors from async work (promises, timers) —
 * those must be caught where they happen and dispatched as actions.
 *
 * This is a safety net, not a control-flow tool. Reducers should never throw
 * on purpose: an invalid action belongs in validation middleware, and an
 * impossible state should be made unrepresentable by the types. A throwing
 * reducer commits nothing, so the state stays at its last good value.
 *
 * If dispatching the error action throws as well, that second error is
 * reported but not turned into another action (no infinite loop).
 */
export function createErrorReportingMiddleware<S, A>(
  options: ErrorReportingOptions<S, A>,
): Middleware<S, A> {
  const { report, toAction, rethrow = false } = options;
  return (api) => {
    let handlingError = false;
    return (next) => (action) => {
      try {
        next(action);
      } catch (error) {
        report({ error, action, state: api.getState() });
        if (toAction && !handlingError) {
          const errorAction = toAction(error, action);
          if (errorAction !== null && errorAction !== undefined) {
            handlingError = true;
            try {
              api.dispatch(errorAction);
            } finally {
              handlingError = false;
            }
          }
        }
        if (rethrow) throw error;
      }
    };
  };
}
