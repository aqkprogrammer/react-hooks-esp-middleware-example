import { WorkspaceState } from "../reducers";
import { types } from "../types";

const themeClassNameKey = "themeClassName";
export const themeClassName = () => localStorage.getItem(themeClassNameKey);

export const applyLocalStorageMiddleware = (
  state: WorkspaceState,
  dispatch: any
) => action => {
  switch (action.type) {
    case types.SET_THEME_ACTION:
      localStorage.setItem(themeClassNameKey, action.payload);
      dispatch(action);
      break;
    default:
      dispatch(action);
  }
};
