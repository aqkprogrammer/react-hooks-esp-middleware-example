/**
 * This wouldn't exist, it's just here to act as the shell/workspace to enable the demo,
 * by simulating this layer.
 */
import * as uuid from "uuid";
import produce from "immer";
import { types } from "./types";
import { themeClassName } from "./middleware/localStorageMiddleware";

export interface WorkspaceState {
  modelId: string;
  themeClassName: string;
  userToken: string;
  /**
   * WIP:
   * Put all user input into a forms object, for validation etc
   */
  forms: {
    login: {
      errors: any[];
      username: {
        errors: any[];
        input: string;
      };
      password: {
        errors: any[];
        input: string;
      };
    };
  };
}

export const initialState: WorkspaceState = {
  modelId: `workspace-id-${uuid.v4()}`,
  themeClassName: themeClassName() || "external",
  userToken: null,
  // WIP
  forms: {
    login: {
      errors: [],
      username: {
        errors: [],
        input: ""
      },
      password: {
        errors: [],
        input: ""
      }
    }
  }
};

export const reducer = produce((draft, action) => {
  console.log("Workspace Reducer", {
    oldState: JSON.stringify(draft),
    type: action.type,
    payload: action.payload
  });
  switch (action.type) {
    case types.auth.LOGIN_SUCCESS_ACTION:
      console.log("LOGIN_SUCCESS_ACTION");
      draft.userToken = action.payload.token;
      draft.forms.login.errors = [];
      draft.forms.login.username.input = "";
      draft.forms.login.username.errors = [];
      draft.forms.login.password.input = "";
      draft.forms.login.password.errors = [];
      return;
    case types.auth.LOGIN_FAILURE_ACTION:
      console.warn("LOGIN_FAILURE_ACTION");
      return;
    case types.auth.LOGOUT_SUCCESS_ACTION:
      console.log("LOGOUT_SUCCESS_ACTION");
      delete draft.userToken;
      return;
    case types.SET_THEME_ACTION:
      console.log("SET_THEME_ACTION");
      draft.themeClassName = action.payload;
      return;
    case types.TYPING_USERNAME:
      draft.forms.login.username.input = action.payload;
      return;
    case types.TYPING_PASSWORD:
      draft.forms.login.password.input = action.payload;
      return;
    case types.TYPING:
      const { input, fieldKey, formKey } = action.payload;
      draft.forms[formKey][fieldKey].input = input;
      return;
    case types.validation.VALIDATION_FAILURE:
      const errors: any = action.payload;
      console.log("VALIDATION_FAILURE", errors);
      if (errors.login) {
        draft.forms.login.errors = errors.login.errors;
        draft.forms.login.username.errors = errors.login.username;
        draft.forms.login.password.errors = errors.login.password;
      }
      return;
  }
});
