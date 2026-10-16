/**
 * Fake price service: one tick every 2 seconds per subscribed currency pair.
 * Prices are random — this is a simulation, not market data.
 *
 * Each tile now creates its own service instance, so two tiles can subscribe
 * to the same pair independently (the original shared one module-level map).
 */
import { NEVER, of, timer, type Observable } from 'rxjs';
import { finalize, map, takeWhile } from 'rxjs/operators';

export interface PriceTick {
  symbol: string;
  price: number;
}

export interface CcyPairPriceService {
  subscribe: (ccyPair: string) => Observable<PriceTick>;
  unsubscribe: (ccyPair: string) => Observable<string>;
  unsubscribeAll: () => Observable<string[]>;
}

const createPrice = (ccyPair: string): PriceTick => ({
  symbol: ccyPair,
  price: Math.round(Math.random() * 10 * 10_000) / 10_000,
});

export function createCcyPairPriceService(tickMs = 2000): CcyPairPriceService {
  const subscriptions = new Set<string>();
  return {
    subscribe(ccyPair) {
      if (subscriptions.has(ccyPair)) return NEVER;
      subscriptions.add(ccyPair);
      return timer(1, tickMs).pipe(
        takeWhile(() => subscriptions.has(ccyPair)),
        map(() => createPrice(ccyPair)),
        finalize(() => subscriptions.delete(ccyPair)),
      );
    },
    unsubscribe(ccyPair) {
      subscriptions.delete(ccyPair);
      return of(ccyPair);
    },
    unsubscribeAll() {
      const keys = [...subscriptions];
      subscriptions.clear();
      return of(keys);
    },
  };
}
