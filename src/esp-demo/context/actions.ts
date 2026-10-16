import type { Dispatch } from '../../middleware/reducer/types';
import { types, type LoginField, type Theme, type WorkspaceAction } from './types';

/**
 * Action creators bound to `dispatch` — "we can use actions as a proxy for
 * dispatch in views". Renamed from `useActions` because it calls no hooks
 * (the `use` prefix is reserved for functions that do).
 */
export const createActions = (dispatch: Dispatch<WorkspaceAction>) => ({
  login: (username: string, password: string) =>
    dispatch({ type: types.auth.LOGIN_REQUEST_ACTION, payload: { username, password } }),
  logout: () => dispatch({ type: types.auth.LOGOUT_REQUEST_ACTION }),
  setTheme: (themeClassName: Theme) =>
    dispatch({ type: types.SET_THEME_ACTION, payload: themeClassName }),
  typing: (input: string, fieldKey: LoginField, formKey: 'login' = 'login') =>
    dispatch({ type: types.TYPING, payload: { input, fieldKey, formKey } }),
});

export type WorkspaceActions = ReturnType<typeof createActions>;
