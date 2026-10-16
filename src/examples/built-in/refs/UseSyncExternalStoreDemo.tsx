import { useState, useSyncExternalStore } from 'react';
import { Badge, Button, Callout, Panel, RenderCount, TextField } from '../../../components/ui';
import { cartActions, cartStore, serverCart, type CartState } from './cartStore';

/**
 * Subscribes to a slice of the module-level cart store. The selector must
 * return a value that stays identical (`Object.is`) while the slice is
 * unchanged — a primitive, or an object taken from the immutable state.
 */
function useCart<T>(selector: (state: CartState) => T): T {
  return useSyncExternalStore(
    cartStore.subscribe,
    () => selector(cartStore.getSnapshot()),
    () => selector(serverCart),
  );
}

const products = [
  { id: 'apple', name: 'Apple' },
  { id: 'bread', name: 'Bread' },
  { id: 'cheese', name: 'Cheese' },
];

/** One external store shared by independent components, each subscribed to a slice. */
export default function UseSyncExternalStoreDemo() {
  return (
    <div className="stack">
      <div className="grid">
        <Panel title="Writers" description="Plain function calls — no React state, no context.">
          <div className="row">
            {products.map((product) => (
              <Button key={product.id} onClick={() => cartActions.add(product.id, product.name)}>
                Add {product.name}
              </Button>
            ))}
          </div>
        </Panel>
        <Panel title="Header badge" description="Selects the total quantity (a number).">
          <RenderCount label="Badge">
            <CartBadge />
          </RenderCount>
        </Panel>
      </div>
      <div className="grid">
        <Panel title="Cart list" description="Selects `state.items`.">
          <RenderCount label="List">
            <CartList />
          </RenderCount>
        </Panel>
        <Panel
          title="Coupon"
          description="Selects `state.coupon` — item changes do not re-render it."
        >
          <RenderCount label="Coupon">
            <CouponBox />
          </RenderCount>
        </Panel>
      </div>
      <Panel
        title="Pitfall: mutable snapshots"
        description="getSnapshot must return a new value when data changes."
      >
        <div className="row">
          <Button
            variant="danger"
            onClick={() => cartActions.addByMutation('mutant', 'Mutated item')}
          >
            Push into items and notify (bug)
          </Button>
          <Button onClick={() => cartActions.reset()}>Reset the store</Button>
        </div>
        <p className="small muted">
          The mutated item is in the store, but React compares snapshots with <code>Object.is</code>
          , sees the same object and skips rendering. It appears only after the next real update.
        </p>
      </Panel>
      <Callout tone="warn" title="getSnapshot must be cached">
        <code>() =&gt; store.getSnapshot().items.filter(…)</code> returns a new array on every call.
        React calls <code>getSnapshot</code> repeatedly, sees a &quot;change&quot; each time and
        throws <em>&quot;The result of getSnapshot should be cached&quot;</em> / an infinite-loop
        error. Select stable data and derive in render (or memoise per state), as{' '}
        <code>CartBadge</code> does by returning a number.
      </Callout>
    </div>
  );
}

function CartBadge() {
  const count = useCart((state) => state.items.reduce((total, item) => total + item.qty, 0));
  return (
    <p>
      Cart <Badge tone="info">{count}</Badge>
      <span className="visually-hidden"> items</span>
    </p>
  );
}

function CartList() {
  const items = useCart((state) => state.items);
  return (
    <ul className="list" aria-label="Cart items">
      {items.length === 0 ? <li className="muted">Empty</li> : null}
      {items.map((item) => (
        <li key={item.id} className="spread">
          <span>
            {item.name} × {item.qty}
          </span>
          <Button
            size="sm"
            variant="danger"
            aria-label={`Remove ${item.name}`}
            onClick={() => cartActions.remove(item.id)}
          >
            Remove
          </Button>
        </li>
      ))}
    </ul>
  );
}

function CouponBox() {
  const coupon = useCart((state) => state.coupon);
  const [draft, setDraft] = useState('');
  return (
    <form
      className="stack"
      onSubmit={(event) => {
        event.preventDefault();
        cartActions.applyCoupon(draft.trim() || null);
      }}
    >
      <TextField
        label="Coupon code"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
      <div className="row">
        <Button type="submit">Apply</Button>
        <span aria-label="Applied coupon">{coupon ?? 'No coupon'}</span>
      </div>
    </form>
  );
}
