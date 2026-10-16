import * as React from "react";
import { createContext, useContext, useReducer, useEffect } from "react";
import { reducer, initialState } from "./reducers";
import { useActions } from "./actions";
import { WorkspaceContext } from "../../../context/context";
import { applyESPMiddleware } from "../../../common/middleware/espMiddleware";

export const AccumulatorsContext = createContext(initialState);

export const AccumulatorsProvider = ({ children }) => {
  // Just getting the workspace here to ensure we can...
  const workspace = useContext(WorkspaceContext);
  // Note the dispatchs are chained together, one passed into the next
  const [state, dispatch] = useReducer(reducer, initialState);
  const [espDispatch, espDispose] = applyESPMiddleware(state.modelId, dispatch);
  const actions = useActions(state, espDispatch);

  useEffect(() => {
    console.log("AccumulatorsProvider", {
      accumulatorsState: state,
      workspaceContext: workspace
    });
  }, [state, workspace]);

  return (
    <AccumulatorsContext.Provider value={{ state, dispatch, actions }}>
      {children}
    </AccumulatorsContext.Provider>
  );
};
