import { actions as espActions } from "../common/middleware/espMiddleware";
import { types } from "./types";

// We can use actions as a proxy for dispatch in views
export const useActions = (state, dispatch) => ({
  triggerAction: (payload, type = types.TRIGGER_ACTION) =>
    dispatch({ type, payload }),
  setTheme: (themeClassName: string) =>
    dispatch({ type: types.SET_THEME_ACTION, payload: themeClassName }),
  typingUsername: input =>
    dispatch({
      type: types.TYPING_USERNAME,
      payload: input
    }),
  typingPassword: input =>
    dispatch({
      type: types.TYPING_PASSWORD,
      payload: input
    }),
  typing: (
    input: string,
    fieldKey: string, // enum?
    formKey: string
  ) =>
    dispatch({
      type: types.TYPING,
      payload: {
        input,
        fieldKey,
        formKey
      }
    }),
  ...espActions(dispatch)
});
