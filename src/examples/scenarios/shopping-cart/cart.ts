/**
 * The cart domain: types, a pure reducer over a discriminated union of
 * actions, a runtime validator for persisted data and derived totals.
 * Nothing here knows about React or storage.
 *
 * Money is kept in integer cents so `0.1 + 0.2` rounding never shows up in
 * a total; it is formatted only at the edge (Intl.NumberFormat).
 */

export interface CartProduct {
  id: string;
  name: string;
  priceCents: number;
}

export interface CartLine {
  productId: string;
  name: string;
  /** Price captured when the item was added, like a real checkout. */
  unitPriceCents: number;
  quantity: number;
}

export interface CartState {
  lines: CartLine[];
}

export type CartAction =
  | { type: 'add'; product: CartProduct }
  | { type: 'remove'; productId: string }
  | { type: 'setQuantity'; productId: string; quantity: number }
  | { type: 'clear' };

export const MAX_QUANTITY = 10;
export const FREE_SHIPPING_FROM_CENTS = 75_00;
export const SHIPPING_CENTS = 5_99;
export const TAX_RATE = 0.08;

export const EMPTY_CART: CartState = { lines: [] };

const clampQuantity = (quantity: number) =>
  Math.min(MAX_QUANTITY, Math.max(0, Math.floor(quantity)));

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'add': {
      const { product } = action;
      const existing = state.lines.find((line) => line.productId === product.id);
      if (existing) {
        if (existing.quantity >= MAX_QUANTITY) return state;
        return {
          lines: state.lines.map((line) =>
            line.productId === product.id ? { ...line, quantity: line.quantity + 1 } : line,
          ),
        };
      }
      return {
        lines: [
          ...state.lines,
          {
            productId: product.id,
            name: product.name,
            unitPriceCents: product.priceCents,
            quantity: 1,
          },
        ],
      };
    }
    case 'remove':
      return { lines: state.lines.filter((line) => line.productId !== action.productId) };
    case 'setQuantity': {
      if (!Number.isFinite(action.quantity)) return state;
      const quantity = clampQuantity(action.quantity);
      if (quantity === 0)
        return cartReducer(state, { type: 'remove', productId: action.productId });
      return {
        lines: state.lines.map((line) =>
          line.productId === action.productId ? { ...line, quantity } : line,
        ),
      };
    }
    case 'clear':
      return EMPTY_CART;
  }
}

const isCartLine = (value: unknown): value is CartLine => {
  if (typeof value !== 'object' || value === null) return false;
  const line = value as Record<string, unknown>;
  return (
    typeof line.productId === 'string' &&
    typeof line.name === 'string' &&
    Number.isInteger(line.unitPriceCents) &&
    (line.unitPriceCents as number) >= 0 &&
    Number.isInteger(line.quantity) &&
    (line.quantity as number) >= 1 &&
    (line.quantity as number) <= MAX_QUANTITY
  );
};

/** Persisted data is user-editable and may come from an older release: check everything. */
export function isCartState(value: unknown): value is CartState {
  if (typeof value !== 'object' || value === null) return false;
  const { lines } = value as { lines?: unknown };
  if (!Array.isArray(lines) || !lines.every(isCartLine)) return false;
  return new Set(lines.map((line) => line.productId)).size === lines.length;
}

export interface CartTotals {
  itemCount: number;
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  /** How much more to spend for free shipping (0 once reached or when empty). */
  toFreeShippingCents: number;
}

/** Derived data: computed during render from the lines, never stored. */
export function getCartTotals(state: CartState): CartTotals {
  const itemCount = state.lines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotalCents = state.lines.reduce(
    (sum, line) => sum + line.unitPriceCents * line.quantity,
    0,
  );
  const empty = itemCount === 0;
  const freeShipping = subtotalCents >= FREE_SHIPPING_FROM_CENTS;
  const shippingCents = empty || freeShipping ? 0 : SHIPPING_CENTS;
  const taxCents = Math.round(subtotalCents * TAX_RATE);
  return {
    itemCount,
    subtotalCents,
    shippingCents,
    taxCents,
    totalCents: subtotalCents + shippingCents + taxCents,
    toFreeShippingCents: empty || freeShipping ? 0 : FREE_SHIPPING_FROM_CENTS - subtotalCents,
  };
}
