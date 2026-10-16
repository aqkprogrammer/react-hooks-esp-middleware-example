import { useState, type FormEvent } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Button, Panel, RenderCount, TextField, ValueTable } from '../../../components/ui';
import {
  COUPONS,
  createShopStore,
  selectSubtotal,
  ShopStoreContext,
  useShop,
  type ShopProduct,
} from './shopStore';

const products: ShopProduct[] = [
  { id: 1, name: 'Notebook', price: 4.5 },
  { id: 2, name: 'Pen', price: 1.25 },
  { id: 3, name: 'Desk lamp', price: 19.99 },
];

const money = (value: number) => `$${value.toFixed(2)}`;

/**
 * Zustand: a store with state *and* actions, read through selectors. The
 * render counters show that components re-render only when what they select
 * changes.
 */
export default function ZustandDemo() {
  const [store] = useState(createShopStore);
  return (
    <ShopStoreContext value={store}>
      <div className="grid">
        <Panel title="Products" description="Selects only actions, which never change.">
          <RenderCount label="Products">
            <ProductList />
          </RenderCount>
        </Panel>
        <Panel title="Cart" description="Selects the lines.">
          <RenderCount label="Cart">
            <CartLines />
          </RenderCount>
        </Panel>
        <Panel title="Summary" description="useShallow over derived numbers.">
          <RenderCount label="Summary">
            <Summary />
          </RenderCount>
        </Panel>
      </div>
    </ShopStoreContext>
  );
}

function ProductList() {
  const add = useShop((state) => state.add);
  return (
    <ul className="list">
      {products.map((product) => (
        <li key={product.id} className="spread">
          <span>
            {product.name} <span className="muted">{money(product.price)}</span>
          </span>
          <Button size="sm" onClick={() => add(product)} aria-label={`Add ${product.name}`}>
            Add
          </Button>
        </li>
      ))}
    </ul>
  );
}

function CartLines() {
  const lines = useShop((state) => state.lines);
  const decrement = useShop((state) => state.decrement);
  const clear = useShop((state) => state.clear);
  return (
    <div className="stack">
      <ul className="list" aria-label="Cart lines">
        {lines.length === 0 ? <li className="muted">Empty.</li> : null}
        {lines.map((line) => (
          <li key={line.id} className="spread">
            <span>
              {line.name} × {line.qty}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => decrement(line.id)}
              aria-label={`Remove one ${line.name}`}
            >
              −1
            </Button>
          </li>
        ))}
      </ul>
      <div>
        <Button variant="ghost" onClick={clear} disabled={lines.length === 0}>
          Clear cart
        </Button>
      </div>
    </div>
  );
}

function Summary() {
  // A new object on every call — useShallow compares its fields, so this
  // component re-renders only when a number actually changes.
  const { items, subtotal, coupon } = useShop(
    useShallow((state) => ({
      items: state.lines.reduce((sum, line) => sum + line.qty, 0),
      subtotal: selectSubtotal(state),
      coupon: state.coupon,
    })),
  );
  const applyCoupon = useShop((state) => state.applyCoupon);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const discount = coupon ? subtotal * (COUPONS[coupon] ?? 0) : 0;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(applyCoupon(code) ? null : `"${code}" is not a valid coupon.`);
  };

  return (
    <div className="stack">
      <ValueTable
        label="Totals"
        rows={{
          Items: items,
          Subtotal: money(subtotal),
          Coupon: coupon ?? '—',
          Total: money(subtotal - discount),
        }}
      />
      <form className="row" onSubmit={submit} aria-label="Apply a coupon">
        <TextField
          label="Coupon code"
          hint="Try SAVE10"
          value={code}
          error={message}
          onChange={(event) => setCode(event.target.value)}
        />
        <Button type="submit">Apply</Button>
      </form>
    </div>
  );
}
