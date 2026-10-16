import { createContext, use } from 'react';
import { useStore } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';
import { createStore } from 'zustand/vanilla';

export interface ShopProduct {
  id: number;
  name: string;
  price: number;
}

export interface CartLine extends ShopProduct {
  qty: number;
}

export interface ShopState {
  lines: CartLine[];
  coupon: string | null;
  // Actions live in the store next to the data they change.
  add: (product: ShopProduct) => void;
  decrement: (id: number) => void;
  applyCoupon: (code: string) => boolean;
  clear: () => void;
}

export const SHOP_STORAGE_KEY = 'playground:zustand-shop';
export const COUPONS: Record<string, number> = { SAVE10: 0.1 };

/**
 * A vanilla store per call (`createStore`, not the global `create` hook), so
 * every mounted demo and every test gets its own state. Middleware nest:
 * `devtools` (Redux DevTools, a no-op without the extension) wraps `persist`
 * (localStorage, only the data — never the functions).
 */
export function createShopStore() {
  return createStore<ShopState>()(
    devtools(
      persist(
        (set) => ({
          lines: [],
          coupon: null,
          add: (product) =>
            set(
              (state) => {
                const existing = state.lines.find((line) => line.id === product.id);
                return {
                  lines: existing
                    ? state.lines.map((line) =>
                        line.id === product.id ? { ...line, qty: line.qty + 1 } : line,
                      )
                    : [...state.lines, { ...product, qty: 1 }],
                };
              },
              undefined,
              'shop/add',
            ),
          decrement: (id) =>
            set(
              (state) => ({
                lines: state.lines
                  .map((line) => (line.id === id ? { ...line, qty: line.qty - 1 } : line))
                  .filter((line) => line.qty > 0),
              }),
              undefined,
              'shop/decrement',
            ),
          applyCoupon: (code) => {
            const normalised = code.trim().toUpperCase();
            if (!(normalised in COUPONS)) return false;
            set({ coupon: normalised }, undefined, 'shop/applyCoupon');
            return true;
          },
          clear: () => set({ lines: [], coupon: null }, undefined, 'shop/clear'),
        }),
        {
          name: SHOP_STORAGE_KEY,
          version: 1,
          storage: createJSONStorage(() => localStorage),
          partialize: (state) => ({ lines: state.lines, coupon: state.coupon }),
        },
      ),
      { name: 'Playground shop' },
    ),
  );
}

export type ShopStore = ReturnType<typeof createShopStore>;

export const ShopStoreContext = createContext<ShopStore | null>(null);

/** Subscribe to a slice of the nearest shop store. */
export function useShop<T>(selector: (state: ShopState) => T): T {
  const store = use(ShopStoreContext);
  if (!store) throw new Error('useShop must be used inside <ShopStoreContext>.');
  return useStore(store, selector);
}

export const selectSubtotal = (state: ShopState) =>
  state.lines.reduce((sum, line) => sum + line.price * line.qty, 0);
