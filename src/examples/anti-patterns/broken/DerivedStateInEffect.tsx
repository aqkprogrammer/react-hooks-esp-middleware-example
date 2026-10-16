/**
 * INTENTIONALLY BROKEN — shown as text only, never imported or executed.
 * Anti-pattern: derived state stored in useState and synchronised with
 * effects, including an effect chain (one effect's setState triggers the
 * next). Every keystroke renders 3 times, the UI briefly shows stale values,
 * and `react-hooks/set-state-in-effect` flags each setState.
 * Corrected version: ../DerivedStateDemo.tsx
 */
import { useEffect, useState } from 'react';

interface Item {
  id: number;
  name: string;
  price: number;
}

export function Cart({ items }: { items: Item[] }) {
  const [query, setQuery] = useState('');
  const [visible, setVisible] = useState<Item[]>(items);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState('');

  // ❌ Effect 1: derive the filtered list.
  useEffect(() => {
    setVisible(items.filter((item) => item.name.includes(query)));
  }, [items, query]);

  // ❌ Effect 2 runs only after effect 1's render: a chain.
  useEffect(() => {
    setTotal(visible.reduce((sum, item) => sum + item.price, 0));
  }, [visible]);

  // ❌ Effect 3 runs after effect 2's render.
  useEffect(() => {
    setSummary(`${visible.length} items, ${total.toFixed(2)} total`);
  }, [visible, total]);

  return (
    <div>
      <input value={query} onChange={(event) => setQuery(event.target.value)} />
      <p>{summary}</p>
    </div>
  );
}
