import * as uuid from "uuid";
import produce from "immer";
import { types } from "./types";
import { PriceTick } from "../../../common/services/ccyPairPriceService";

export interface PriceState {
  modelId: string; // Each tile will need a model id to register with ESP
  prices: { [key: string]: number };
  priceInput: string;
  clickCount: number;
}

export const initialState: PriceState = {
  modelId: `price-id-${uuid.v4()}`,
  prices: {},
  priceInput: "gbpusd",
  clickCount: 0
};

export const reducer = produce((draft, action) => {
  console.log("Price Reducer", {
    oldState: JSON.stringify(draft),
    type: action.type,
    payload: action.payload
  });
  switch (action.type) {
    case types.TYPING_PRICE:
      draft.priceInput = action.payload;
      return;
    case types.SUBSCRIBE_PRICE:
      draft.priceInput = initialState.priceInput;
      return;
    case types.PRICE_UPDATE:
      const priceTick: PriceTick = action.payload;
      draft.prices[priceTick.symbol] = priceTick.price;
      return;
    case types.PRICE_UNSUBSCRIBED: {
      const ccyPair: string = action.payload;
      delete draft.prices[ccyPair];
      return;
    }
    case types.ALL_PRICES_UNSUBSCRIBED: {
      draft.prices = {};
      draft.priceInput = initialState.priceInput;
      return;
    }
    case types.CLICKED:
      draft.clickCount += 1;
      return;
    case types.esp.PREPROCESS_ACTION:
      console.log("Price Reducer opting in to handle esp.PREPROCESS_ACTION");
      return;
    case types.esp.POSTPROCESS_ACTION:
      const eventTypes: string[] = action.payload;
      console.log("Price Reducer opting in to handle esp.POSTPROCESS_ACTION");
      if (eventTypes.indexOf(types.common.KEY_PRESSED) > -1) {
        console.log("User pressed a key");
      }
      return;
  }
});
