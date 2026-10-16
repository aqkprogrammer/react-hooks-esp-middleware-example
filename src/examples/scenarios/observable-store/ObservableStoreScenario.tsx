import { useId, useMemo, useState, useSyncExternalStore } from 'react';
import { distinctUntilChanged, map, pairwise } from 'rxjs';
import { Button, Callout, Panel, RenderCount } from '../../../components/ui';
import { shallowEqualObjects, useExternalStore, useObservable } from '../../../hooks';
import {
  createShop,
  formatMoney,
  selectCart,
  selectItemCount,
  selectSummary,
  selectTotal,
  selectUserName,
  toObservable,
  type Shop,
  type ShopActions,
  type ShopState,
} from './shopStore';
import './ObservableStoreScenario.css';

/**
 * An external store read through selectors. Each panel is wrapped in
 * `<RenderCount>` (a `<Profiler>`), so you can see which components commit
 * after each action — and which do not.
 */
export default function ObservableStoreScenario() {
  // One store per scenario instance (and per test), never a module singleton.
  const [{ store, actions }] = useState<Shop>(createShop);

  return (
    <div className="stack">
      <Panel title="Actions" description="Every action updates one slice of the store.">
        <Toolbar actions={actions} />
      </Panel>

      <div className="observable-grid">
        <RenderCount label="User badge">
          <UserBadge store={store} />
        </RenderCount>
        <RenderCount label="Cart count">
          <CartCount store={store} />
        </RenderCount>
        <RenderCount label="Summary">
          <Summary store={store} />
        </RenderCount>
        <RenderCount label="Whole state">
          <WholeState store={store} />
        </RenderCount>
        <RenderCount label="Line count">
          <LineCount store={store} />
        </RenderCount>
        <RenderCount label="Total trend">
          <TotalTrend store={store} />
        </RenderCount>
      </div>

      <RenderCount label="Cart lines">
        <CartLines store={store} actions={actions} />
      </RenderCount>

      <Callout title="Why unrelated components stay still">
        <code>useExternalStore(store, selector)</code> is built on <code>useSyncExternalStore</code>
        . After every store change React calls each subscriber&apos;s <code>getSnapshot</code>; when
        the selected value is the same (by <code>Object.is</code>, or by the equality function) the
        component is not rendered at all. “Whole state” subscribes without a selector, so it commits
        on every change; “Summary” only stays still with shallow equality because its selector
        builds a new object each time.
      </Callout>
    </div>
  );
}

interface StoreProps {
  store: Shop['store'];
}

function Toolbar({ actions }: { actions: ShopActions }) {
  return (
    <div className="row">
      <Button onClick={actions.renameUser}>Rename user</Button>
      <Button onClick={actions.addItem}>Add item</Button>
      <Button onClick={actions.toggleDiscount}>Toggle 10% discount</Button>
      <Button onClick={actions.checkout}>Checkout (clears cart + discount)</Button>
      <Button variant="ghost" onClick={actions.reset}>
        Reset store
      </Button>
    </div>
  );
}

function UserBadge({ store }: StoreProps) {
  const name = useExternalStore(store, selectUserName);
  return (
    <p className="observable-tile">
      Signed in as <strong>{name}</strong>
    </p>
  );
}

function CartCount({ store }: StoreProps) {
  const count = useExternalStore(store, selectItemCount);
  return (
    <p className="observable-tile">
      Items in cart: <strong>{count}</strong>
    </p>
  );
}

/** Owns its checkbox, so toggling it re-renders only this component. */
function Summary({ store }: StoreProps) {
  const [shallow, setShallow] = useState(true);
  const shallowId = useId();
  const summary = useExternalStore(store, selectSummary, shallow ? shallowEqualObjects : Object.is);
  return (
    <div className="observable-tile stack">
      <span>
        {summary.count} items · total <strong>{formatMoney(summary.total)}</strong>
      </span>
      <span className="row small">
        <input
          id={shallowId}
          type="checkbox"
          checked={shallow}
          onChange={(event) => setShallow(event.target.checked)}
        />
        <label htmlFor={shallowId}>
          Compare with <code>shallowEqualObjects</code> (the selector returns a new object)
        </label>
      </span>
    </div>
  );
}

function WholeState({ store }: StoreProps) {
  const state: ShopState = useExternalStore(store);
  return (
    <p className="observable-tile">
      Whole state: {state.cart.length} lines, discount {state.discount}%, user {state.user.name}
    </p>
  );
}

const subscribeTo = (store: Shop['store']) => (onChange: () => void) => store.subscribe(onChange);

/** The primitive itself: `useSyncExternalStore` with a snapshot that is a primitive value. */
function LineCount({ store }: StoreProps) {
  const subscribe = useMemo(() => subscribeTo(store), [store]);
  const lines = useSyncExternalStore(subscribe, () => store.getState().cart.length);
  return (
    <p className="observable-tile">
      Distinct products (raw <code>useSyncExternalStore</code>): <strong>{lines}</strong>
    </p>
  );
}

/** RxJS view of the same store: operators derive "previous → current" pairs. */
function TotalTrend({ store }: StoreProps) {
  // Memoised: a new pipe() each render would re-subscribe every render.
  const trend$ = useMemo(
    () => toObservable(store).pipe(map(selectTotal), distinctUntilChanged(), pairwise()),
    [store],
  );
  const { value, status } = useObservable<[number, number] | null>(trend$, null);
  return (
    <p className="observable-tile">
      {status === 'waiting' || !value
        ? 'Total trend (RxJS pairwise): no change yet'
        : `Total changed from ${formatMoney(value[0])} to ${formatMoney(value[1])}`}
    </p>
  );
}

function CartLines({ store, actions }: StoreProps & { actions: ShopActions }) {
  const cart = useExternalStore(store, selectCart);
  if (cart.length === 0) return <p className="muted">The cart is empty.</p>;
  return (
    <ul className="observable-lines" aria-label="Cart lines">
      {cart.map((line) => (
        <li key={line.id} className="spread">
          <span>
            {line.name} × {line.qty}{' '}
            <span className="muted small">{formatMoney(line.price * line.qty)}</span>
          </span>
          <span className="row">
            <Button size="sm" onClick={() => actions.increment(line.id)}>
              +1 <span className="visually-hidden">{line.name}</span>
            </Button>
            <Button size="sm" variant="ghost" onClick={() => actions.remove(line.id)}>
              Remove <span className="visually-hidden">{line.name}</span>
            </Button>
          </span>
        </li>
      ))}
    </ul>
  );
}
