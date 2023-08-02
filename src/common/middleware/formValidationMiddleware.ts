import { Action } from "../types/action";

export type ValidationHandler<TState> = (state: TState, action: Action) => any;
export interface ValidationMap<TState> {
  [key: string]: ValidationHandler<TState>;
}

export const applyFormValidationMiddleware = <TState>(
  state: TState,
  dispatch: any,
  map: ValidationMap<TState>
) => (action: Action) => {
  const validationHandler = map[action.type];
  if (validationHandler) {
    const errors = validationHandler(state, action);
    if (errors) {
      dispatch({
        type: types.VALIDATION_FAILURE,
        payload: errors
      });
      return;
    }
  }
  dispatch(action);
};

export const types = {
  VALIDATION_FAILURE: "VALIDATION_FAILURE"
};
