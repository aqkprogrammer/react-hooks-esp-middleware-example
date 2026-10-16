import * as React from "react";
import { createContext, useEffect, useReducer } from "react";
import { reducer, initialState, WorkspaceState } from "./reducers";
import { useActions } from "./actions";
import { applyESPMiddleware } from "../common/middleware/espMiddleware";
import { applyFormValidationMiddleware } from "../common/middleware/formValidationMiddleware";
import { applyLoginMiddleware } from "./middleware/loginMiddleware";
import { applyLocalStorageMiddleware } from "./middleware/localStorageMiddleware";
import { validationMap } from "./validation";

export const WorkspaceContext = createContext(initialState);

export const WorkspaceProvider = ({ children }) => {
  // TODO: Cascade events to all the reducers / merge them or whatever (if we really want to do this, might be ESP's job to let everyone know)
  const [state, dispatch] = useReducer(reducer, initialState);
  let [enhancedDispatch] = applyESPMiddleware(state.modelId, dispatch);
  enhancedDispatch = applyLoginMiddleware(state, enhancedDispatch);
  enhancedDispatch = applyLocalStorageMiddleware(state, enhancedDispatch);
  enhancedDispatch = applyFormValidationMiddleware<WorkspaceState>(
    state,
    enhancedDispatch,
    validationMap
  );
  const actions = useActions(state, enhancedDispatch);

  // useEffect hooks and middleware manage side effects
  useEffect(() => {
    console.log("WorkspaceProvider", { workspaceState: state });
  }, [state]);

  return (
    // We could provide the espRouter to the application if required here
    <WorkspaceContext.Provider value={{ state, enhancedDispatch, actions }}>
      {children}
    </WorkspaceContext.Provider>
  );
};
