import { useState } from 'react';
import { Button, EventLog, Panel, useEventLog } from '../../../components/ui';
import { createEmitter, useEventEmitter } from '../../../hooks/advanced';

/** One typed bus for the whole demo, created once at module level. */
type CartEvents = {
  'item-added': { name: string; price: number };
  'cart-cleared': void;
};
const cartBus = createEmitter<CartEvents>();

const products = [
  { name: 'Keyboard', price: 89 },
  { name: 'Mouse', price: 39 },
  { name: 'Monitor', price: 249 },
];

/** Publishes events; knows nothing about who listens. */
function ProductList() {
  return (
    <div className="row">
      {products.map((product) => (
        <Button key={product.name} onClick={() => cartBus.emit('item-added', product)}>
          Add {product.name} (${product.price})
        </Button>
      ))}
      <Button variant="danger" onClick={() => cartBus.emit('cart-cleared')}>
        Clear cart
      </Button>
    </div>
  );
}

/** Subscriber #1: keeps a running total. */
function CartTotal() {
  const [total, setTotal] = useState(0);
  const [count, setCount] = useState(0);
  useEventEmitter(cartBus, 'item-added', ({ price }) => {
    setTotal((value) => value + price);
    setCount((value) => value + 1);
  });
  useEventEmitter(cartBus, 'cart-cleared', () => {
    setTotal(0);
    setCount(0);
  });
  return (
    <p>
      Cart: <strong>{count}</strong> items, total <strong>${total}</strong>
    </p>
  );
}

/** Subscriber #2: an activity feed that can be unmounted. */
function ActivityFeed() {
  const { entries, log, clear } = useEventLog(10);
  useEventEmitter(cartBus, 'item-added', ({ name }) => log(`${name} added`, 'success'));
  useEventEmitter(cartBus, 'cart-cleared', () => log('cart cleared', 'warn'));
  return <EventLog title="Activity feed" entries={entries} onClear={clear} />;
}

export default function UseEventEmitterDemo() {
  const [showFeed, setShowFeed] = useState(true);

  return (
    <div className="stack">
      <Panel title="Publisher" description="Buttons emit typed events on a shared bus.">
        <ProductList />
      </Panel>
      <Panel
        title="Subscribers"
        description="Each subscriber unsubscribes when it unmounts: events emitted while the feed is hidden are simply not seen by it."
      >
        <CartTotal />
        <Button onClick={() => setShowFeed((value) => !value)} aria-pressed={showFeed}>
          {showFeed ? 'Unmount activity feed' : 'Mount activity feed'}
        </Button>
        {showFeed ? <ActivityFeed /> : <p className="muted">Activity feed unmounted.</p>}
      </Panel>
    </div>
  );
}
