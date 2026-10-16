import { useCallback } from 'react';
import { useLocalStorage, type StorageError } from '../../../hooks';
import { cartReducer, EMPTY_CART, getCartTotals, isCartState, type CartAction } from './cart';

export const CART_STORAGE_KEY = 'scenario:shopping-cart';

/**
 * A reducer whose store is localStorage: `dispatch(action)` runs
 * `cartReducer` against the *stored* cart inside `useLocalStorage`'s
 * functional update. One source of truth, so there is no `useReducer` +
 * `useEffect` copy to keep in sync, and other tabs see every change.
 */
export function useCart(onError?: (error: StorageError) => void) {
  const [cart, setCart] = useLocalStorage(CART_STORAGE_KEY, EMPTY_CART, {
    validate: isCartState,
    onError,
  });
  const dispatch = useCallback(
    (action: CartAction) => setCart((previous) => cartReducer(previous, action)),
    [setCart],
  );
  // Cheap to compute, so no memo: derived during render, never stored.
  const totals = getCartTotals(cart);
  return { cart, totals, dispatch };
}
