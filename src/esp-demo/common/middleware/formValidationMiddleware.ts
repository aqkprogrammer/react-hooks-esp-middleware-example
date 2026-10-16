import type { Middleware } from '../../../middleware/reducer/types';

export type ValidationHandler<TState, TAction, TErrors> = (
  state: TState,
  action: TAction,
) => TErrors | null;

export type ValidationMap<TState, TAction extends { type: string }, TErrors> = Partial<
  Record<TAction['type'], ValidationHandler<TState, TAction, TErrors>>
>;

export const types = {
  VALIDATION_FAILURE: 'VALIDATION_FAILURE',
} as const;

export interface ValidationFailureAction<TErrors> {
  type: typeof types.VALIDATION_FAILURE;
  payload: TErrors;
}

/**
 * The original form-validation middleware, now in the shared middleware
 * shape. If a validator for the action's type returns errors, the action is
 * swallowed and `VALIDATION_FAILURE` is dispatched instead.
 */
export const createFormValidationMiddleware =
  <TState, TAction extends { type: string }, TErrors>(
    map: ValidationMap<TState, TAction, TErrors>,
  ): Middleware<TState, TAction | ValidationFailureAction<TErrors>> =>
  ({ getState }) =>
  (next) =>
  (action) => {
    const handler = map[action.type as TAction['type']];
    if (handler) {
      const errors = handler(getState(), action as TAction);
      if (errors) {
        next({ type: types.VALIDATION_FAILURE, payload: errors });
        return;
      }
    }
    next(action);
  };
