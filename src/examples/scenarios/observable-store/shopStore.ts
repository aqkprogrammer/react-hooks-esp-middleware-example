/**
 * A small external store (state outside React) built on the library's
 * `createStore`, plus an RxJS view of it. Components subscribe to *slices*
 * with selectors; actions are plain functions that work outside React too.
 */
import { Observable } from 'rxjs';
import { createStore, type ExternalStore } from '../../../hooks';

export interface CartLine {
  id: string;
  name: string;
  price: number;
  qty: number;
}

export interface ShopState {
  user: { name: string };
  cart: readonly CartLine[];
  /** Discount in percent. */
  discount: number;
}

const INITIAL: ShopState = {
  user: { name: 'Ada' },
  cart: [
    { id: 'kb', name: 'Keyboard', price: 89, qty: 1 },
    { id: 'ms', name: 'Mouse', price: 39, qty: 2 },
  ],
  discount: 0,
};

const CATALOG: readonly Omit<CartLine, 'qty'>[] = [
  { id: 'mon', name: 'Monitor', price: 249 },
  { id: 'hub', name: 'USB-C hub', price: 59 },
  { id: 'cam', name: 'Webcam', price: 79 },
];

const NAMES = ['Ada', 'Grace', 'Linus', 'Margaret', 'Alan'];

export interface ShopActions {
  renameUser: () => void;
  addItem: () => void;
  increment: (id: string) => void;
  remove: (id: string) => void;
  toggleDiscount: () => void;
  /** Two slices in one `setState`: subscribers are notified once. */
  checkout: () => void;
  reset: () => void;
}

export interface Shop {
  store: ExternalStore<ShopState>;
  actions: ShopActions;
}

export function createShop(): Shop {
  const store = createStore<ShopState>(INITIAL);
  const { setState, getState } = store;
  const actions: ShopActions = {
    renameUser: () => {
      const current = NAMES.indexOf(getState().user.name);
      setState({ user: { name: NAMES[(current + 1) % NAMES.length] ?? 'Ada' } });
    },
    addItem: () =>
      setState((state) => {
        const next = CATALOG.find((item) => !state.cart.some((line) => line.id === item.id));
        if (!next) return state; // everything is already in the cart: no-op, nobody notified
        return { cart: [...state.cart, { ...next, qty: 1 }] };
      }),
    increment: (id) =>
      setState((state) => ({
        cart: state.cart.map((line) => (line.id === id ? { ...line, qty: line.qty + 1 } : line)),
      })),
    remove: (id) => setState((state) => ({ cart: state.cart.filter((line) => line.id !== id) })),
    toggleDiscount: () => setState((state) => ({ discount: state.discount ? 0 : 10 })),
    checkout: () => setState({ cart: [], discount: 0 }),
    reset: () => setState(store.getInitialState(), true),
  };
  return { store, actions };
}

// ---- Selectors: module-level, so their identity is stable ------------------
export const selectUserName = (state: ShopState) => state.user.name;
export const selectCart = (state: ShopState) => state.cart;
export const selectItemCount = (state: ShopState) =>
  state.cart.reduce((sum, line) => sum + line.qty, 0);
export const selectSubtotal = (state: ShopState) =>
  state.cart.reduce((sum, line) => sum + line.qty * line.price, 0);
export const selectTotal = (state: ShopState) =>
  Math.round(selectSubtotal(state) * (100 - state.discount)) / 100;
/** Returns a NEW object on every call: needs shallow equality to avoid useless renders. */
export const selectSummary = (state: ShopState) => ({
  count: selectItemCount(state),
  total: selectTotal(state),
});

/** The store as an RxJS Observable: emits the current state on subscribe, then every change. */
export function toObservable<T extends object>(store: ExternalStore<T>): Observable<T> {
  return new Observable<T>((subscriber) => {
    subscriber.next(store.getState());
    return store.subscribe((state) => subscriber.next(state));
  });
}

export const formatMoney = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
