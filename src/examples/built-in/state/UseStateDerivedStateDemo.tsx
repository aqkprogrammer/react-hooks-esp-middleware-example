import { useState } from 'react';
import { Badge, Button, Callout, Panel, TextField } from '../../../components/ui';

interface Item {
  id: number;
  name: string;
  price: number;
}

const initialItems: Item[] = [
  { id: 1, name: 'Pretzel', price: 3 },
  { id: 2, name: 'Seaweed', price: 4 },
  { id: 3, name: 'Granola bar', price: 2 },
];

/**
 * Duplicated state (a copy of an item, a stored total) drifts out of sync.
 * Store the minimal state (an id) and derive the rest during render.
 */
export default function UseStateDerivedStateDemo() {
  return (
    <div className="stack">
      <p className="muted">
        Select an item, then rename it. Both panels start identical; only the state shape differs.
      </p>
      <div className="grid">
        <Panel
          title="Bug: duplicated state"
          description={
            <>
              <code>selectedItem</code> is a <em>copy</em> of an array element.
            </>
          }
        >
          <DuplicatedSelection />
        </Panel>
        <Panel
          title="Fix: store the id, derive the item"
          description={
            <>
              <code>selectedId</code> + <code>items.find()</code> during render.
            </>
          }
        >
          <DerivedSelection />
        </Panel>
      </div>
      <Callout title="Rule of thumb">
        If a value can be computed from props or other state, compute it during render. Only reach
        for <code>useMemo</code> when the computation is measurably expensive.
      </Callout>
    </div>
  );
}

function DuplicatedSelection() {
  const [items, setItems] = useState(initialItems);
  const [selectedItem, setSelectedItem] = useState<Item | null>(initialItems[0] ?? null);
  // Also duplicated: a total kept in state that must be updated by hand.
  const [total, setTotal] = useState(() => initialItems.reduce((sum, item) => sum + item.price, 0));

  return (
    <ItemEditor
      prefix="Duplicated"
      items={items}
      selectedId={selectedItem?.id ?? null}
      selectedName={selectedItem?.name ?? 'nothing'}
      total={total}
      onSelect={(item) => setSelectedItem(item)}
      onRename={(id, name) =>
        setItems((previous) => previous.map((item) => (item.id === id ? { ...item, name } : item)))
      }
      onPriceChange={(id, price) => {
        setItems((previous) =>
          previous.map((item) => (item.id === id ? { ...item, price } : item)),
        );
        // Forgot to update `total`: the classic drift between duplicated values.
      }}
      onReset={() => {
        setItems(initialItems);
        setSelectedItem(initialItems[0] ?? null);
        setTotal(initialItems.reduce((sum, item) => sum + item.price, 0));
      }}
    />
  );
}

function DerivedSelection() {
  const [items, setItems] = useState(initialItems);
  const [selectedId, setSelectedId] = useState<number | null>(initialItems[0]?.id ?? null);
  // Derived during render: always consistent with `items`.
  const selected = items.find((item) => item.id === selectedId);
  const total = items.reduce((sum, item) => sum + item.price, 0);

  return (
    <ItemEditor
      prefix="Derived"
      items={items}
      selectedId={selectedId}
      selectedName={selected?.name ?? 'nothing'}
      total={total}
      onSelect={(item) => setSelectedId(item.id)}
      onRename={(id, name) =>
        setItems((previous) => previous.map((item) => (item.id === id ? { ...item, name } : item)))
      }
      onPriceChange={(id, price) =>
        setItems((previous) => previous.map((item) => (item.id === id ? { ...item, price } : item)))
      }
      onReset={() => {
        setItems(initialItems);
        setSelectedId(initialItems[0]?.id ?? null);
      }}
    />
  );
}

interface ItemEditorProps {
  prefix: string;
  items: Item[];
  selectedId: number | null;
  selectedName: string;
  total: number;
  onSelect: (item: Item) => void;
  onRename: (id: number, name: string) => void;
  onPriceChange: (id: number, price: number) => void;
  onReset: () => void;
}

function ItemEditor({
  prefix,
  items,
  selectedId,
  selectedName,
  total,
  onSelect,
  onRename,
  onPriceChange,
  onReset,
}: ItemEditorProps) {
  return (
    <div className="stack">
      <fieldset className="stack">
        <legend className="visually-hidden">{prefix} items</legend>
        {items.map((item) => (
          <div key={item.id} className="row">
            <input
              type="radio"
              name={`${prefix}-selection`}
              checked={item.id === selectedId}
              onChange={() => onSelect(item)}
              aria-label={`${prefix}: select item ${item.id}`}
            />
            <TextField
              label={`${prefix}: name of item ${item.id}`}
              hideLabel
              value={item.name}
              onChange={(event) => onRename(item.id, event.target.value)}
            />
            <TextField
              label={`${prefix}: price of item ${item.id}`}
              hideLabel
              type="number"
              min={0}
              value={item.price}
              onChange={(event) => onPriceChange(item.id, Number(event.target.value))}
              style={{ width: '5rem' }}
            />
          </div>
        ))}
      </fieldset>
      <p aria-label={`${prefix} summary`}>
        Selected: <strong>{selectedName}</strong> · Total: <Badge>{total}</Badge>
      </p>
      <Button variant="ghost" size="sm" onClick={onReset}>
        Reset {prefix.toLowerCase()} panel
      </Button>
    </div>
  );
}
