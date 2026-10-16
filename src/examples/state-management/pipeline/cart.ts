/**
 * Domain model for the middleware pipeline demo: a small cart whose reducer
 * stays pure while middleware handle logging, analytics, validation, async
 * loading, error reporting and persistence.
 */
import type { Product } from '../../../mocks/data';
import {
  isThunk,
  type AnalyticsEventMap,
  type Thunk,
  type ThunkActionOf,
  type ValidationErrors,
  type ValidatorMap,
} from '../../../middleware/reducer';

export interface CartItem {
  /** Derived from the name, so adding the same product twice merges the lines. */
  id: string;
  name: string;
  price: number;
  qty: number;
}

export interface CartState {
  items: CartItem[];
  loading: boolean;
  errors: ValidationErrors;
  /** Set by ERROR_REPORTED / SUGGESTIONS_FAILED so the UI can show what went wrong. */
  failure: string | null;
}

export type CartAction =
  | { type: 'ADD_ITEM'; name: string; price: number; qty: number }
  | { type: 'REMOVE_ITEM'; id: string }
  | { type: 'CLEAR_CART' }
  | { type: 'VALIDATION_FAILED'; errors: ValidationErrors; rejectedType: string }
  | { type: 'SUGGESTIONS_REQUESTED' }
  | { type: 'SUGGESTIONS_LOADED'; count: number }
  | { type: 'SUGGESTIONS_FAILED'; message: string }
  | { type: 'SIMULATE_REDUCER_BUG' }
  | { type: 'ERROR_REPORTED'; message: string };

/** The store accepts plain actions and thunks. */
export type CartDispatchable = ThunkActionOf<CartState, CartAction>;

export const CART_STORAGE_KEY = 'playground:pipeline-cart:v1';
export const MAX_LINES = 5;
export const MAX_QTY = 10;

export const emptyCart: CartState = { items: [], loading: false, errors: {}, failure: null };

export const itemId = (name: string) => name.trim().toLowerCase().replace(/\s+/g, '-');

export function cartReducer(state: CartState, action: CartDispatchable): CartState {
  // Thunks never reach the reducer while the thunk middleware is enabled.
  // When it is switched off in the demo they do, and are ignored.
  if (isThunk(action)) return state;
  switch (action.type) {
    case 'ADD_ITEM': {
      const id = itemId(action.name);
      const existing = state.items.find((item) => item.id === id);
      const items = existing
        ? state.items.map((item) =>
            item.id === id ? { ...item, qty: item.qty + action.qty } : item,
          )
        : [...state.items, { id, name: action.name.trim(), price: action.price, qty: action.qty }];
      return { ...state, items, errors: {}, failure: null };
    }
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter((item) => item.id !== action.id) };
    case 'CLEAR_CART':
      return state.items.length === 0 ? state : { ...state, items: [] };
    case 'VALIDATION_FAILED':
      return { ...state, errors: action.errors };
    case 'SUGGESTIONS_REQUESTED':
      return { ...state, loading: true, failure: null };
    case 'SUGGESTIONS_LOADED':
      return { ...state, loading: false };
    case 'SUGGESTIONS_FAILED':
      return { ...state, loading: false, failure: action.message };
    case 'SIMULATE_REDUCER_BUG':
      // Deliberately broken so the error-reporting middleware has something
      // to catch. Real reducers must not throw: see the catalog entry.
      throw new Error('cartReducer cannot handle SIMULATE_REDUCER_BUG');
    case 'ERROR_REPORTED':
      return { ...state, failure: action.message };
  }
}

export const addItem = (name: string, price: number, qty: number): CartAction => ({
  type: 'ADD_ITEM',
  name,
  price,
  qty,
});

/**
 * Async thunk: loads the two top-rated products and adds each one through
 * the normal ADD_ITEM action — so every item is still validated, logged,
 * tracked and persisted. Errors are caught here and dispatched as an action
 * because a rejected promise is invisible to middleware.
 */
export const addTopRatedProducts = (): Thunk<CartState, CartAction> => async (dispatch) => {
  dispatch({ type: 'SUGGESTIONS_REQUESTED' });
  try {
    const response = await fetch('/api/products?sort=rating&order=desc&pageSize=2');
    if (!response.ok) throw new Error(`Products request failed (${response.status})`);
    const { items } = (await response.json()) as { items: Product[] };
    for (const product of items) dispatch(addItem(product.name, product.price, 1));
    dispatch({ type: 'SUGGESTIONS_LOADED', count: items.length });
  } catch (error) {
    dispatch({
      type: 'SUGGESTIONS_FAILED',
      message: error instanceof Error ? error.message : String(error),
    });
  }
};

export const cartValidators: ValidatorMap<CartState, CartDispatchable> = {
  ADD_ITEM: (action, state) => {
    const errors: Record<string, string> = {};
    if (!action.name.trim()) errors.name = 'Name is required.';
    if (!Number.isFinite(action.price) || action.price <= 0) {
      errors.price = 'Price must be greater than 0.';
    }
    if (!Number.isInteger(action.qty) || action.qty < 1 || action.qty > MAX_QTY) {
      errors.qty = `Quantity must be a whole number from 1 to ${MAX_QTY}.`;
    }
    const isNewLine = !state.items.some((item) => item.id === itemId(action.name));
    if (isNewLine && state.items.length >= MAX_LINES) {
      errors.cart = `The cart holds at most ${MAX_LINES} different products.`;
    }
    return errors;
  },
};

export const cartAnalytics: AnalyticsEventMap<CartState, CartDispatchable> = {
  ADD_ITEM: (action, next) => ({
    name: 'Product Added',
    properties: { product: action.name.trim(), qty: action.qty, lines: next.items.length },
  }),
  REMOVE_ITEM: (action) => ({ name: 'Product Removed', properties: { id: action.id } }),
  CLEAR_CART: (_action, next, prev) =>
    prev.items.length === next.items.length
      ? null
      : { name: 'Cart Cleared', properties: { lines: prev.items.length } },
};

export const isCartItems = (value: unknown): value is CartItem[] =>
  Array.isArray(value) &&
  value.every(
    (item: unknown) =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as CartItem).id === 'string' &&
      typeof (item as CartItem).name === 'string' &&
      typeof (item as CartItem).price === 'number' &&
      typeof (item as CartItem).qty === 'number',
  );

export const cartTotal = (items: readonly CartItem[]) =>
  items.reduce((sum, item) => sum + item.price * item.qty, 0);
