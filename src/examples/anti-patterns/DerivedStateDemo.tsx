import { useState } from 'react';
import { Callout, Panel, RenderCount, TextField, ValueTable } from '../../components/ui';

interface Item {
  id: number;
  name: string;
  price: number;
}

const ITEMS: readonly Item[] = [
  { id: 1, name: 'Keyboard', price: 49.5 },
  { id: 2, name: 'Mouse', price: 19.99 },
  { id: 3, name: 'Monitor', price: 189 },
  { id: 4, name: 'Monitor arm', price: 59 },
  { id: 5, name: 'USB hub', price: 24.25 },
];

/**
 * Corrected version of broken/DerivedStateInEffect.tsx: the filtered list,
 * total and summary are *calculated during render* from the only real
 * state (the query). One render per keystroke, never an intermediate frame
 * with stale numbers, and no effects to keep in sync.
 */
export default function DerivedStateDemo() {
  const [query, setQuery] = useState('');
  return (
    <div className="stack">
      <Panel title="Cart filter" description="Only `query` is state; everything else is derived.">
        <TextField
          label="Filter items"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <RenderCount label="Cart">
          <Cart query={query} items={ITEMS} />
        </RenderCount>
      </Panel>
      <Callout title="Rule of thumb">
        If a value can be computed from props or state, compute it while rendering. Reach for{' '}
        <code>useMemo</code> only if that computation is measurably slow — not an effect.
      </Callout>
    </div>
  );
}

function Cart({ query, items }: { query: string; items: readonly Item[] }) {
  const needle = query.trim().toLowerCase();
  const visible = items.filter((item) => item.name.toLowerCase().includes(needle));
  const total = visible.reduce((sum, item) => sum + item.price, 0);
  const summary = `${visible.length} items, ${total.toFixed(2)} total`;
  return (
    <div className="stack">
      <ul className="list" aria-label="Cart items">
        {visible.map((item) => (
          <li key={item.id} className="spread">
            {item.name} <span className="mono">{item.price.toFixed(2)}</span>
          </li>
        ))}
      </ul>
      <ValueTable rows={{ Summary: summary }} />
    </div>
  );
}
