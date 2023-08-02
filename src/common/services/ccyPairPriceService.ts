/**
 * Fake service, 2 second ticks
 */
import { Observable, of, never, timer } from "rxjs";
import { map, takeWhile, finalize } from "rxjs/operators";

export interface PriceTick {
  symbol: string;
  price: number;
}

let subscriptions = {};

const createPrice = (ccyPair: string): PriceTick => ({
  symbol: ccyPair,
  price: Math.random() * 10
});

export const subscribe = (ccyPair: string): Observable<PriceTick> => {
  if (subscriptions[ccyPair]) {
    return never();
  } else {
    subscriptions[ccyPair] = true;
    return timer(1, 2000).pipe(
      takeWhile(v => subscriptions[ccyPair]),
      map(() => createPrice(ccyPair)),
      finalize(() => console.warn("ccyPair obs completed: " + ccyPair))
    );
  }
};

export const unsubscribe = (ccyPair: string): Observable<string> => {
  const sub = subscriptions[ccyPair];
  if (sub) {
    delete subscriptions[ccyPair];
  }
  return of(ccyPair);
};

export const unsubscribeAll = (): Observable<string[]> => {
  const keys = Object.keys(subscriptions);
  subscriptions = {};
  return of(keys);
};
