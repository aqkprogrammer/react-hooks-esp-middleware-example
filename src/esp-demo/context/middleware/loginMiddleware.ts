import type { Middleware } from '../../../middleware/reducer/types';
import type { WorkspaceAction } from '../types';
import type { WorkspaceState } from '../reducers';

export const types = {
  LOGIN_REQUEST_ACTION: 'LOGIN_REQUEST_ACTION',
  LOGIN_SUCCESS_ACTION: 'LOGIN_SUCCESS_ACTION',
  LOGIN_FAILURE_ACTION: 'LOGIN_FAILURE_ACTION',
  LOGOUT_REQUEST_ACTION: 'LOGOUT_REQUEST_ACTION',
  LOGOUT_SUCCESS_ACTION: 'LOGOUT_SUCCESS_ACTION',
} as const;

/**
 * Handles the async side of authentication.
 *
 * The original posted hard-coded credentials to the public reqres.in API,
 * which now requires an API key. The playground instead calls its own mocked
 * `/api/login` (served by MSW — see src/mocks/handlers.ts): any credentials
 * work except the password "wrong", which returns 401.
 */
export const loginMiddleware: Middleware<WorkspaceState, WorkspaceAction> =
  (api) => (next) => (action) => {
    switch (action.type) {
      case types.LOGIN_REQUEST_ACTION: {
        next(action); // lets the reducer show a pending state
        const { username, password } = action.payload;
        fetch('/api/login', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ username, password }),
        })
          .then(async (response) => {
            const body = (await response.json()) as { token?: string; message?: string };
            if (!response.ok || !body.token) {
              throw new Error(body.message ?? `Login failed (${response.status})`);
            }
            api.dispatch({ type: types.LOGIN_SUCCESS_ACTION, payload: { token: body.token } });
          })
          .catch((error: unknown) => {
            api.dispatch({
              type: types.LOGIN_FAILURE_ACTION,
              payload: { message: error instanceof Error ? error.message : String(error) },
            });
          });
        return;
      }
      case types.LOGOUT_REQUEST_ACTION:
        // Send logout to the backend here if needed.
        api.dispatch({ type: types.LOGOUT_SUCCESS_ACTION });
        return;
      default:
        next(action);
    }
  };
