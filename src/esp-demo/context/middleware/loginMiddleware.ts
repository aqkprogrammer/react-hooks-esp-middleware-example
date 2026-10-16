import axios from "axios";
import { WorkspaceState } from "../reducers";

export const applyLoginMiddleware = (
  state: WorkspaceState,
  dispatch: any
) => action => {
  switch (action.type) {
    case types.LOGIN_REQUEST_ACTION:
      // ie. /api/verifyChallenge, for now just hitting a hosted api for fake users etc
      axios
        .post("https://reqres.in/api/login", {
          // ...action.payload,
          email: "eve.holt@reqres.in",
          password: "cityslicka"
        })
        .then(serverResponse => {
          console.log("serverResponse", serverResponse);
          dispatch({
            type: types.LOGIN_SUCCESS_ACTION,
            payload: serverResponse.data
          });
        })
        .catch(error => {
          console.log("error", error);
          dispatch({ type: types.LOGIN_FAILURE_ACTION, payload: error });
        });
      break;
    case types.LOGOUT_REQUEST_ACTION:
      // Send logout to BE if needed
      dispatch({ type: types.LOGOUT_SUCCESS_ACTION });
      break;
    default:
      dispatch(action);
  }
};

export const types = {
  LOGIN_REQUEST_ACTION: "LOGIN_REQUEST_ACTION",
  LOGIN_SUCCESS_ACTION: "LOGIN_SUCCESS_ACTION",
  LOGIN_FAILURE_ACTION: "LOGIN_FAILURE_ACTION",
  LOGOUT_REQUEST_ACTION: "LOGOUT_REQUEST_ACTION",
  LOGOUT_SUCCESS_ACTION: "LOGOUT_SUCCESS_ACTION"
};
