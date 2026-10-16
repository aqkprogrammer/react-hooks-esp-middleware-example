import { actions as espActions } from "../../../common/middleware/espMiddleware";
import { types } from "./types";

// We can use actions as a proxy for dispatch in views
export const useActions = (state, dispatch) => ({
  subscribe: ccyPair =>
    dispatch({
      type: types.SUBSCRIBE_PRICE,
      payload: ccyPair
    }),
  unsubscribe: ccyPair =>
    dispatch({
      type: types.UNSUBSCRIBE_PRICE,
      payload: ccyPair
    }),
  clicked: () => dispatch({ type: types.CLICKED }),
  unsubscribeAllPrices: () => dispatch({ type: types.UNSUBSCRIBE_ALL_PRICES }),
  typingPrice: priceInput =>
    dispatch({
      type: types.TYPING_PRICE,
      payload: priceInput
    }),
  ...espActions(dispatch)
});
