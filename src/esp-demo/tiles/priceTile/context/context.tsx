import * as React from "react";
import { createContext, useContext, useReducer, useEffect } from "react";
import { reducer, initialState, PriceState } from "./reducers";
import { types } from "./types";
import { useActions } from "./actions";
import { priceStreamHandlerMap } from "./stream";
import { useStream } from "../../../common/hooks/useStream";
import { WorkspaceContext } from "../../../context/context";
import { applyESPMiddleware } from "../../../common/middleware/espMiddleware";

export const PriceContext = createContext(initialState);

export const PriceTileProvider = ({ children }) => {
  // Just getting the workspace here to ensure we can...
  const workspace = useContext(WorkspaceContext);
  // Note the dispatchs are chained together, one passed into the next
  const [state, dispatch] = useReducer(reducer, initialState);
  const [espDispatch, espDispose] = applyESPMiddleware(state.modelId, dispatch);
  const [streamDispatch] = useStream<PriceState>(
    state,
    espDispatch,
    priceStreamHandlerMap,
    types.UNSUBSCRIBE_ALL_PRICES
  );
  const actions = useActions(state, streamDispatch);

  useEffect(() => {
    console.log("PriceTileProvider", {
      priceState: state,
      workspaceContext: workspace
    });
  }, [state, workspace]);

  return (
    <PriceContext.Provider value={{ state, dispatch, actions }}>
      {children}
    </PriceContext.Provider>
  );
};
