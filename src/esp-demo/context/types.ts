import type { EspStoreAction } from '../../middleware/esp-js';
import { types as espTypes } from '../../middleware/esp-js/espMiddleware';
import {
  types as validationTypes,
  type ValidationFailureAction,
} from '../common/middleware/formValidationMiddleware';
import { types as commonTypes } from '../common/types/types';
import { types as authTypes } from './middleware/loginMiddleware';

export const themes = ['internal', 'external', 'badger'] as const;
export type Theme = (typeof themes)[number];
export const isTheme = (value: unknown): value is Theme =>
  typeof value === 'string' && (themes as readonly string[]).includes(value);

export const types = {
  auth: authTypes,
  esp: espTypes,
  common: commonTypes,
  validation: validationTypes,
  SET_THEME_ACTION: 'SET_THEME_ACTION',
  /** One generic typing action with a field key (the per-field actions didn't scale). */
  TYPING: 'TYPING',
} as const;

export type LoginField = 'username' | 'password';

export interface LoginErrors {
  login: { errors: string[]; username: string[]; password: string[] };
}

export type WorkspaceOwnAction =
  | { type: typeof types.SET_THEME_ACTION; payload: Theme }
  | {
      type: typeof types.TYPING;
      payload: { input: string; fieldKey: LoginField; formKey: 'login' };
    }
  | {
      type: typeof authTypes.LOGIN_REQUEST_ACTION;
      payload: { username: string; password: string };
    }
  | { type: typeof authTypes.LOGIN_SUCCESS_ACTION; payload: { token: string } }
  | { type: typeof authTypes.LOGIN_FAILURE_ACTION; payload: { message: string } }
  | { type: typeof authTypes.LOGOUT_REQUEST_ACTION }
  | { type: typeof authTypes.LOGOUT_SUCCESS_ACTION }
  | ValidationFailureAction<LoginErrors>;

export type WorkspaceAction = EspStoreAction<WorkspaceOwnAction>;
