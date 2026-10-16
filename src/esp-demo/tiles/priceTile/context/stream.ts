import { types } from "./types";
import { Observable } from "rxjs";
import { mergeMap, map, tap } from "rxjs/operators";
import { StreamHandlerMap } from "../../../common/hooks/useStream";
import { Action } from "../../../common/types/action";
import {
  subscribe,
  unsubscribe,
  unsubscribeAll
} from "../../../common/services/ccyPairPriceService";

export const priceStreamHandlerMap: StreamHandlerMap = {
  [types.SUBSCRIBE_PRICE]: (inputObs: Observable<Action>) => {
    return inputObs.pipe(
      mergeMap(action => subscribe(action.payload)),
      map(priceTick => ({
        type: types.PRICE_UPDATE,
        payload: priceTick
      }))
    );
  },
  [types.UNSUBSCRIBE_PRICE]: (inputObs: Observable<Action>) => {
    return inputObs.pipe(
      mergeMap(action => unsubscribe(action.payload)),
      tap(ccyPair => console.warn("Unsubscribed", ccyPair)),
      map(ccyPair => ({
        type: types.PRICE_UNSUBSCRIBED,
        payload: ccyPair
      }))
    );
  },
  [types.UNSUBSCRIBE_ALL_PRICES]: (inputObs: Observable<Action>) => {
    return inputObs.pipe(
      mergeMap(action => unsubscribeAll()),
      tap((keys: string[]) => console.warn("Unsubscribed All Prices", keys)),
      map(() => ({ type: types.ALL_PRICES_UNSUBSCRIBED }))
    );
  }
};
