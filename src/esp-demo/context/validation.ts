import type { ValidationMap } from '../common/middleware/formValidationMiddleware';
import type { WorkspaceState } from './reducers';
import type { LoginErrors, WorkspaceAction } from './types';

/**
 * Validate user inputs and actions given the current state. Validation reads
 * the form from state (not from the action), as in the original.
 */
export const validationMap: ValidationMap<WorkspaceState, WorkspaceAction, LoginErrors> = {
  LOGIN_REQUEST_ACTION: (state) => {
    const errors: LoginErrors = { login: { errors: [], username: [], password: [] } };
    const addError = (error: string, field: string[]) => {
      errors.login.errors.push(error);
      field.push(error);
    };
    const { username, password } = state.forms.login;
    if (username.input.length < 3) addError('Min username length is 3', errors.login.username);
    if (username.input.length > 10) addError('Max username length is 10', errors.login.username);
    if (password.input.length < 3) addError('Min password length is 3', errors.login.password);
    return errors.login.errors.length ? errors : null;
  },
};
