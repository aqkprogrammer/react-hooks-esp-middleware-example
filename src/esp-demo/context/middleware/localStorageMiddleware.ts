import type { Middleware } from '../../../middleware/reducer/types';
import { isTheme, type Theme, type WorkspaceAction } from '../types';
import type { WorkspaceState } from '../reducers';

const themeClassNameKey = 'themeClassName';

/** Reads the persisted theme (client-only; called from a lazy state initialiser). */
export const themeClassName = (): Theme | null => {
  try {
    const stored = window.localStorage.getItem(themeClassNameKey);
    return isTheme(stored) ? stored : null;
  } catch {
    return null; // storage disabled
  }
};

/** Persists the theme whenever it changes, then lets the action through. */
export const localStorageMiddleware: Middleware<WorkspaceState, WorkspaceAction> =
  () => (next) => (action) => {
    if (action.type === 'SET_THEME_ACTION') {
      try {
        window.localStorage.setItem(themeClassNameKey, action.payload);
      } catch {
        // Quota/disabled storage: the theme still changes for this session.
      }
    }
    next(action);
  };
