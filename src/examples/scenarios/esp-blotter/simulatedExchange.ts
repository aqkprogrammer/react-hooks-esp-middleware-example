import { espBroadcast, type EspStoreAction } from '../../../middleware/esp-js';
import type { Middleware } from '../../../middleware/reducer';
import {
  ORDER_FILLED,
  ORDER_SUBMITTED,
  type Fill,
  type TicketAction,
  type TicketState,
} from './trading';

export interface SimulatedExchange {
  /** Dispatch middleware for the ticket store: schedules a fill for every accepted order. */
  middleware: Middleware<TicketState, EspStoreAction<TicketAction>>;
  /** Number of fills still pending. */
  pending: () => number;
  /** Cancels pending fills (component unmount). */
  dispose: () => void;
}

/**
 * Stands in for an exchange gateway. It is ordinary reducer middleware: when
 * the *accepted* `ORDER_SUBMITTED` event comes back from the router (final
 * stage → bridge → dispatch), it lets the reducer run, then schedules a fill
 * and **broadcasts** `ORDER_FILLED` through the same router so every store
 * that observes fills — ticket, blotter, positions — reacts.
 *
 * Orders cancelled by the risk filter never reach the reducer or this
 * middleware, so they are never filled.
 */
export function createSimulatedExchange(fillDelayMs: number): SimulatedExchange {
  const timers = new Set<ReturnType<typeof setTimeout>>();
  let tradeSequence = 0;

  const middleware: SimulatedExchange['middleware'] = (api) => (next) => (action) => {
    next(action);
    if (action.type !== ORDER_SUBMITTED) return;
    const order = action.payload;
    const timer = setTimeout(() => {
      timers.delete(timer);
      tradeSequence += 1;
      const fill: Fill = { ...order, tradeId: `T${tradeSequence}`, filledAt: Date.now() };
      api.dispatch(espBroadcast(ORDER_FILLED, fill));
    }, fillDelayMs);
    timers.add(timer);
  };

  return {
    middleware,
    pending: () => timers.size,
    dispose() {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    },
  };
}
