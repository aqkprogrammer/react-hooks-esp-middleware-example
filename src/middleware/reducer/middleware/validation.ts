import type { Middleware } from '../types';
import { findHandler, type HandlersByType } from './actionTypes';

/** Field (or rule) name → human-readable message. */
export type ValidationErrors = Readonly<Record<string, string>>;

/**
 * Per action type: return the errors for the (narrowed) action given the
 * current state, or `null`/`undefined`/`{}` when it is valid.
 */
export type ValidatorMap<S, A> = HandlersByType<A, [state: S], ValidationErrors | null | undefined>;

export interface ValidationOptions<S, A> {
  validators: ValidatorMap<S, A>;
  /**
   * Builds the action dispatched *instead of* an invalid one, e.g.
   * `(errors, rejected) => ({ type: 'VALIDATION_FAILED', errors, rejectedType: rejected.type })`.
   * It is dispatched through the whole chain, so loggers and reducers see it.
   */
  onInvalid: (errors: ValidationErrors, rejected: A) => A;
}

/**
 * Validates actions *before* they reach the reducer.
 *
 * A generalisation of the original repository's `formValidationMiddleware`
 * (src/esp-demo/common/middleware/formValidationMiddleware.ts): validators are
 * looked up by action type; when one reports errors the action is swallowed
 * (no `next`) and a failure action is dispatched instead. Unlike the original,
 * validators are typed per action, receive the *current* state from
 * `getState()` (not a value captured at render time), and the failure action
 * is yours to define.
 *
 * Validators must be pure and synchronous. For async validation (e.g. "is
 * this username taken?") dispatch a thunk that validates first.
 */
export function createValidationMiddleware<S, A>(
  options: ValidationOptions<S, A>,
): Middleware<S, A> {
  const { validators, onInvalid } = options;
  return (api) => {
    let dispatchingFailure = false;
    return (next) => (action) => {
      const validate = findHandler(validators, action);
      const errors = validate?.(action, api.getState());
      if (errors && Object.keys(errors).length > 0) {
        if (dispatchingFailure) {
          // An action dispatched while reporting a failure (normally the
          // failure action itself) is invalid too: fail loudly instead of
          // recursing forever.
          throw new Error(
            'createValidationMiddleware: an action dispatched while reporting a validation failure was itself invalid.',
          );
        }
        dispatchingFailure = true;
        try {
          api.dispatch(onInvalid(errors, action));
        } finally {
          dispatchingFailure = false;
        }
        return;
      }
      next(action);
    };
  };
}
