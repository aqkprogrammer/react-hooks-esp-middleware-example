/**
 * A module-level external store: plain TypeScript, no React. Components read
 * it with `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)`.
 *
 * Contract that makes it safe for React:
 * - `getSnapshot` returns the *same* value until the state changes
 *   (immutable updates → a new object only when something changed).
 * - `subscribe` returns an unsubscribe function.
 */

export interface CartItem {
  id: string;
  name: string;
  qty: number;
}

export interface CartState {
  items: readonly CartItem[];
  coupon: string | null;
}

type Listener = () => void;

export interface Store<T> {
  getSnapshot(): T;
  subscribe(listener: Listener): () => void;
  setState(update: (state: T) => T): void;
  /** Notifies subscribers without changing the state. */
  emit(): void;
  /** Number of active subscribers (for tests and debugging). */
  listenerCount(): number;
}

export function createStore<T>(initialState: T): Store<T> {
  let state = initialState;
  const listeners = new Set<Listener>();
  return {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setState(update) {
      const next = update(state);
      if (Object.is(next, state)) return;
      state = next;
      listeners.forEach((listener) => listener());
    },
    emit() {
      listeners.forEach((listener) => listener());
    },
    listenerCount: () => listeners.size,
  };
}

export function createInitialCart(): CartState {
  return { items: [{ id: 'apple', name: 'Apple', qty: 1 }], coupon: null };
}

export const cartStore = createStore<CartState>(createInitialCart());

/** What the server renders: there is no per-user cart on the server. */
export const serverCart: CartState = { items: [], coupon: null };

export const cartActions = {
  add(id: string, name: string) {
    cartStore.setState((state) => {
      const existing = state.items.find((item) => item.id === id);
      return {
        ...state,
        items: existing
          ? state.items.map((item) => (item.id === id ? { ...item, qty: item.qty + 1 } : item))
          : [...state.items, { id, name, qty: 1 }],
      };
    });
  },
  remove(id: string) {
    cartStore.setState((state) => ({
      ...state,
      items: state.items.filter((item) => item.id !== id),
    }));
  },
  applyCoupon(coupon: string | null) {
    cartStore.setState((state) => (state.coupon === coupon ? state : { ...state, coupon }));
  },
  /**
   * The pitfall, on purpose: mutates the current snapshot and notifies.
   * `getSnapshot` returns the same object, so React sees "no change".
   */
  addByMutation(id: string, name: string) {
    const state = cartStore.getSnapshot();
    (state.items as CartItem[]).push({ id: `${id}-${state.items.length}`, name, qty: 1 });
    // Listeners run, React calls getSnapshot, gets the same object → no re-render.
    cartStore.emit();
  },
  reset() {
    cartStore.setState(createInitialCart);
  },
};
