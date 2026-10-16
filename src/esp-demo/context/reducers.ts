/**
 * This wouldn't exist in a real app — it acts as the shell/workspace to
 * enable the demo by simulating that layer.
 */
import { produce } from 'immer';
import { themeClassName } from './middleware/localStorageMiddleware';
import { types, type Theme, type WorkspaceAction } from './types';

interface FieldState {
  errors: string[];
  input: string;
}

export interface WorkspaceState {
  themeClassName: Theme;
  userToken: string | null;
  loginStatus: 'idle' | 'pending';
  loginError: string | null;
  forms: {
    login: {
      errors: string[];
      username: FieldState;
      password: FieldState;
    };
  };
}

const emptyLoginForm = (): WorkspaceState['forms']['login'] => ({
  errors: [],
  username: { errors: [], input: '' },
  password: { errors: [], input: '' },
});

export const createInitialState = (): WorkspaceState => ({
  themeClassName: themeClassName() ?? 'external',
  userToken: null,
  loginStatus: 'idle',
  loginError: null,
  forms: { login: emptyLoginForm() },
});

export const reducer = produce((draft: WorkspaceState, action: WorkspaceAction) => {
  switch (action.type) {
    case types.auth.LOGIN_REQUEST_ACTION:
      draft.loginStatus = 'pending';
      draft.loginError = null;
      return;
    case types.auth.LOGIN_SUCCESS_ACTION:
      draft.userToken = action.payload.token;
      draft.loginStatus = 'idle';
      draft.forms.login = emptyLoginForm();
      return;
    case types.auth.LOGIN_FAILURE_ACTION:
      draft.loginStatus = 'idle';
      draft.loginError = action.payload.message;
      return;
    case types.auth.LOGOUT_SUCCESS_ACTION:
      draft.userToken = null;
      return;
    case types.SET_THEME_ACTION:
      draft.themeClassName = action.payload;
      return;
    case types.TYPING: {
      const { input, fieldKey, formKey } = action.payload;
      draft.forms[formKey][fieldKey].input = input;
      return;
    }
    case types.validation.VALIDATION_FAILURE: {
      const { login } = action.payload;
      draft.forms.login.errors = login.errors;
      draft.forms.login.username.errors = login.username;
      draft.forms.login.password.errors = login.password;
      return;
    }
  }
});
