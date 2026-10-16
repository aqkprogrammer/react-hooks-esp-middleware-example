import type { Dispatch } from '../../../../middleware/reducer/types';
import { types, type PriceAction } from './types';

// We can use actions as a proxy for dispatch in views.
export const createActions = (dispatch: Dispatch<PriceAction>) => ({
  subscribe: (ccyPair: string) => dispatch({ type: types.SUBSCRIBE_PRICE, payload: ccyPair }),
  unsubscribe: (ccyPair: string) => dispatch({ type: types.UNSUBSCRIBE_PRICE, payload: ccyPair }),
  clicked: () => dispatch({ type: types.CLICKED }),
  unsubscribeAllPrices: () => dispatch({ type: types.UNSUBSCRIBE_ALL_PRICES }),
  typingPrice: (priceInput: string) => dispatch({ type: types.TYPING_PRICE, payload: priceInput }),
});

export type PriceActions = ReturnType<typeof createActions>;
