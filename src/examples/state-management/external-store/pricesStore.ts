/**
 * A price store that lives outside React (like the ESP price tiles in
 * src/esp-demo): created with `createReducerStore`, so code without hooks — a
 * timer, a socket handler, a test — can dispatch to it and read it.
 */
import { createLogger, createReducerStore, type LogSink } from '../../../middleware/reducer';

export const PAIRS = ['EURUSD', 'GBPUSD', 'USDJPY'] as const;
export type Pair = (typeof PAIRS)[number];

export interface Quote {
  bid: number;
  /** Direction of the last move, shown as text (not colour only). */
  move: 'up' | 'down' | 'flat';
}

export interface PricesState {
  quotes: Record<Pair, Quote>;
  ticks: number;
}

export type PricesAction = { type: 'tick'; pair: Pair } | { type: 'reset' };

const pipSize: Record<Pair, number> = { EURUSD: 0.0001, GBPUSD: 0.0001, USDJPY: 0.01 };

export const initialPrices: PricesState = {
  quotes: {
    EURUSD: { bid: 1.0842, move: 'flat' },
    GBPUSD: { bid: 1.2715, move: 'flat' },
    USDJPY: { bid: 151.32, move: 'flat' },
  },
  ticks: 0,
};

/** Deterministic pseudo-random walk: the move depends only on the tick count. */
export function pricesReducer(state: PricesState, action: PricesAction): PricesState {
  switch (action.type) {
    case 'tick': {
      const steps = ((state.ticks * 7) % 5) - 2 || 1; // -2..2, never 0
      const quote = state.quotes[action.pair];
      const bid = Number((quote.bid + steps * pipSize[action.pair]).toFixed(5));
      return {
        ticks: state.ticks + 1,
        quotes: { ...state.quotes, [action.pair]: { bid, move: steps > 0 ? 'up' : 'down' } },
      };
    }
    case 'reset':
      return initialPrices;
  }
}

export function createPricesStore(sink?: LogSink<PricesState, PricesAction>) {
  return createReducerStore(pricesReducer, initialPrices, sink ? [createLogger({ sink })] : []);
}

export type PricesStore = ReturnType<typeof createPricesStore>;

/** Module-level selectors: stable references that return existing objects. */
export const selectQuote: Record<Pair, (state: PricesState) => Quote> = {
  EURUSD: (state) => state.quotes.EURUSD,
  GBPUSD: (state) => state.quotes.GBPUSD,
  USDJPY: (state) => state.quotes.USDJPY,
};
export const selectTicks = (state: PricesState) => state.ticks;
