import { types } from "./types";
import { WorkspaceState } from "./reducers";
import { Action } from "../common/types/action";
import { ValidationMap } from "../common/middleware/formValidationMiddleware";

/**
 * Validate user inputs and actions given the current state
 */
export const validationMap: ValidationMap<WorkspaceState> = {
  [types.auth.LOGIN_REQUEST_ACTION]: (
    state: WorkspaceState,
    action: Action
  ) => {
    /**
     * WIP
     */
    const errors = {
      login: {
        errors: [], // contains all errors
        username: [],
        password: []
      }
    };
    const addError = (error, field) => {
      errors.login.errors.push(error);
      field.push(error);
    };
    /**
     * TODO: Run some validation rules over the state.form.login (in this case)
     * maybe json schema style validation...
     * username: {
     *   type: "string",
     *   minLength: 3
     * }
     *
     * For now just doing some basic checks for example
     */
    if (state.forms.login.username.input.length < 3) {
      addError("Min username length is 3", errors.login.username);
    }
    if (state.forms.login.username.input.length > 10) {
      addError("Max username length is 10", errors.login.username);
    }
    if (state.forms.login.password.input.length < 3) {
      addError("Min password length is 3", errors.login.password);
    }
    return errors.login.errors.length ? errors : null;
  }
};
