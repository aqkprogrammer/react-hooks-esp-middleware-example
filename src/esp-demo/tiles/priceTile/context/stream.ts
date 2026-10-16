import { mergeMap, map, type Observable } from 'rxjs';
import type { StreamHandlerMap } from '../../../common/middleware/streamMiddleware';
import type { CcyPairPriceService } from '../../../common/services/ccyPairPriceService';
import { types, type PriceAction } from './types';

/** RxJS handlers: each turns an incoming action into a stream of result actions. */
export const createPriceStreamHandlerMap = (
  service: CcyPairPriceService,
): StreamHandlerMap<PriceAction> => ({
  [types.SUBSCRIBE_PRICE]: (input: Observable<PriceAction>) =>
    input.pipe(
      mergeMap((action) =>
        service.subscribe(action.type === types.SUBSCRIBE_PRICE ? action.payload : ''),
      ),
      map((priceTick): PriceAction => ({ type: types.PRICE_UPDATE, payload: priceTick })),
    ),
  [types.UNSUBSCRIBE_PRICE]: (input: Observable<PriceAction>) =>
    input.pipe(
      mergeMap((action) =>
        service.unsubscribe(action.type === types.UNSUBSCRIBE_PRICE ? action.payload : ''),
      ),
      map((ccyPair): PriceAction => ({ type: types.PRICE_UNSUBSCRIBED, payload: ccyPair })),
    ),
  [types.UNSUBSCRIBE_ALL_PRICES]: (input: Observable<PriceAction>) =>
    input.pipe(
      mergeMap(() => service.unsubscribeAll()),
      map((): PriceAction => ({ type: types.ALL_PRICES_UNSUBSCRIBED })),
    ),
});
