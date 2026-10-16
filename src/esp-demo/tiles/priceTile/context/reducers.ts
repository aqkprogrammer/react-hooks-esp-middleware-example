import { produce } from 'immer';
import { types, type PriceAction } from './types';

export interface PriceState {
  prices: Record<string, number>;
  priceInput: string;
  clickCount: number;
  /** Event types processed in the last esp-js dispatch loop (from POSTPROCESS). */
  lastEspEvents: string[];
  lastKeyEvent: string | null;
  error: string | null;
}

export const initialState: PriceState = {
  prices: {},
  priceInput: 'gbpusd',
  clickCount: 0,
  lastEspEvents: [],
  lastKeyEvent: null,
  error: null,
};

export const reducer = produce((draft: PriceState, action: PriceAction) => {
  switch (action.type) {
    case types.TYPING_PRICE:
      draft.priceInput = action.payload;
      return;
    case types.SUBSCRIBE_PRICE:
      draft.priceInput = initialState.priceInput;
      return;
    case types.PRICE_UPDATE:
      draft.prices[action.payload.symbol] = action.payload.price;
      return;
    case types.PRICE_UNSUBSCRIBED:
      delete draft.prices[action.payload];
      return;
    case types.ALL_PRICES_UNSUBSCRIBED:
      draft.prices = {};
      draft.priceInput = initialState.priceInput;
      return;
    case types.CLICKED:
      draft.clickCount += 1;
      return;
    case types.stream.ERROR:
      draft.error = action.payload;
      return;
    // This tile does not own the list of accumulators, but it observes the
    // KEY_PRESSED event so a *broadcast* from another tile reaches it.
    case types.common.KEY_PRESSED:
      draft.lastKeyEvent = action.payload.key;
      return;
    case types.esp.PREPROCESS_ACTION:
      return;
    case types.esp.POSTPROCESS_ACTION:
      draft.lastEspEvents = action.payload;
      return;
  }
});
