/**
 * Event contracts and pure reducers for the ESP trading desk: an order
 * ticket, a trade blotter and a position summary — three independent stores
 * that only communicate through esp-js router events.
 */
import type { EspStoreAction } from '../../../middleware/esp-js';

// ---- Event types (the contract between the stores) ---------------------------
/** Published by the ticket to its own model. A preview filter applies the risk check. */
export const ORDER_SUBMITTED = 'ORDER_SUBMITTED';
/** Broadcast by the simulated exchange when an order fills. */
export const ORDER_FILLED = 'ORDER_FILLED';
/** Broadcast by the blotter when the user busts (cancels) a trade. */
export const TRADE_BUSTED = 'TRADE_BUSTED';

export type Side = 'buy' | 'sell';

export interface Order {
  orderId: string;
  symbol: string;
  side: Side;
  quantity: number;
  price: number;
}

export interface Fill extends Order {
  tradeId: string;
  filledAt: number;
}

export const REFERENCE_PRICES: Readonly<Record<string, number>> = {
  ACME: 182.5,
  GLOBEX: 64.25,
  INITECH: 23.1,
};

export const SYMBOLS = Object.keys(REFERENCE_PRICES);

export const notional = (order: Pick<Order, 'quantity' | 'price'>) => order.quantity * order.price;

export function isOrder(value: unknown): value is Order {
  if (typeof value !== 'object' || value === null) return false;
  const order = value as Partial<Order>;
  return (
    typeof order.orderId === 'string' &&
    typeof order.symbol === 'string' &&
    (order.side === 'buy' || order.side === 'sell') &&
    typeof order.quantity === 'number' &&
    Number.isFinite(order.quantity) &&
    order.quantity > 0 &&
    typeof order.price === 'number' &&
    Number.isFinite(order.price) &&
    order.price > 0
  );
}

export const formatMoney = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

// ---- Order ticket --------------------------------------------------------------
export interface TicketState {
  /** Accepted orders waiting for a fill. */
  working: readonly Order[];
  filled: number;
}

export type TicketAction =
  { type: typeof ORDER_SUBMITTED; payload: Order } | { type: typeof ORDER_FILLED; payload: Fill };

export const initialTicket: TicketState = { working: [], filled: 0 };

export function ticketReducer(
  state: TicketState,
  action: EspStoreAction<TicketAction>,
): TicketState {
  switch (action.type) {
    case ORDER_SUBMITTED:
      return { ...state, working: [...state.working, action.payload] };
    case ORDER_FILLED: {
      const { orderId } = action.payload;
      if (!state.working.some((order) => order.orderId === orderId)) return state;
      return {
        working: state.working.filter((order) => order.orderId !== orderId),
        filled: state.filled + 1,
      };
    }
    default:
      // ESP lifecycle actions (ESP_PREPROCESS_ACTION / ESP_POSTPROCESS_ACTION) are ignored.
      return state;
  }
}

// ---- Trade blotter -------------------------------------------------------------
export interface Trade extends Fill {
  busted: boolean;
}

export interface BlotterState {
  trades: readonly Trade[];
}

export type BlotterAction =
  { type: typeof ORDER_FILLED; payload: Fill } | { type: typeof TRADE_BUSTED; payload: Fill };

export const initialBlotter: BlotterState = { trades: [] };

export function blotterReducer(
  state: BlotterState,
  action: EspStoreAction<BlotterAction>,
): BlotterState {
  switch (action.type) {
    case ORDER_FILLED:
      // Idempotent: a duplicated event must not create a second row.
      if (state.trades.some((trade) => trade.tradeId === action.payload.tradeId)) return state;
      return { trades: [{ ...action.payload, busted: false }, ...state.trades] };
    case TRADE_BUSTED:
      return {
        trades: state.trades.map((trade) =>
          trade.tradeId === action.payload.tradeId ? { ...trade, busted: true } : trade,
        ),
      };
    default:
      return state;
  }
}

// ---- Position summary ----------------------------------------------------------
export interface Position {
  symbol: string;
  /** Signed: buys add, sells subtract. */
  netQuantity: number;
  /** Signed cash flow: buys are negative, sells positive. */
  cash: number;
  trades: number;
}

export interface PositionsState {
  bySymbol: Readonly<Record<string, Position>>;
  /** Trade ids currently included, so duplicates and double busts are ignored. */
  applied: readonly string[];
}

export type PositionsAction = BlotterAction;

export const initialPositions: PositionsState = { bySymbol: {}, applied: [] };

function applyFill(state: PositionsState, fill: Fill, direction: 1 | -1): PositionsState {
  const sign = fill.side === 'buy' ? 1 : -1;
  const current = state.bySymbol[fill.symbol] ?? {
    symbol: fill.symbol,
    netQuantity: 0,
    cash: 0,
    trades: 0,
  };
  const next: Position = {
    symbol: fill.symbol,
    netQuantity: current.netQuantity + direction * sign * fill.quantity,
    cash: current.cash - direction * sign * notional(fill),
    trades: current.trades + direction,
  };
  return {
    ...state,
    bySymbol: { ...state.bySymbol, [fill.symbol]: next },
    applied:
      direction === 1
        ? [...state.applied, fill.tradeId]
        : state.applied.filter((id) => id !== fill.tradeId),
  };
}

export function positionsReducer(
  state: PositionsState,
  action: EspStoreAction<PositionsAction>,
): PositionsState {
  switch (action.type) {
    case ORDER_FILLED:
      return state.applied.includes(action.payload.tradeId)
        ? state
        : applyFill(state, action.payload, 1);
    case TRADE_BUSTED:
      return state.applied.includes(action.payload.tradeId)
        ? applyFill(state, action.payload, -1)
        : state;
    default:
      return state;
  }
}

export function positionTotals(state: PositionsState) {
  const positions = Object.values(state.bySymbol);
  return {
    grossQuantity: positions.reduce((sum, position) => sum + Math.abs(position.netQuantity), 0),
    cash: positions.reduce((sum, position) => sum + position.cash, 0),
  };
}
