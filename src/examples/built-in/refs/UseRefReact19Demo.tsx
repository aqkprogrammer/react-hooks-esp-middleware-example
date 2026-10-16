import { useCallback, useId, useRef, useState, type InputHTMLAttributes, type Ref } from 'react';
import { Button, Callout, EventLog, Panel, useEventLog } from '../../../components/ui';

// ---------------------------------------------------------------------------
// 1. `ref` is a regular prop for function components (React 19).
// ---------------------------------------------------------------------------

interface FancyInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  /** Just a prop — no forwardRef wrapper needed since React 19. */
  ref?: Ref<HTMLInputElement>;
}

function FancyInput({ label, ref, ...props }: FancyInputProps) {
  const id = useId();
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <input ref={ref} id={id} className="input" {...props} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. Ref callbacks can return a cleanup function (React 19).
// ---------------------------------------------------------------------------

interface Item {
  id: number;
  name: string;
}

const initialItems: Item[] = [
  { id: 1, name: 'Apples' },
  { id: 2, name: 'Bread' },
  { id: 3, name: 'Cheese' },
];

/** React 19 ref features: ref as a prop, and ref callback cleanup functions. */
export default function UseRefReact19Demo() {
  const inputRef = useRef<HTMLInputElement>(null);
  const nodesRef = useRef(new Map<number, HTMLLIElement>());
  const nextIdRef = useRef(initialItems.length + 1);
  const [items, setItems] = useState(initialItems);
  const [target, setTarget] = useState(1);
  const targetId = useId();
  const { entries, log, clear } = useEventLog(30);

  // Stable, so each row's ref callback keeps its identity between renders.
  const register = useCallback(
    (id: number, node: HTMLLIElement) => {
      nodesRef.current.set(id, node);
      log(`ref attached: item ${id} (${nodesRef.current.size} tracked)`, 'success');
      return () => {
        nodesRef.current.delete(id);
        log(`ref cleanup: item ${id} (${nodesRef.current.size} tracked)`, 'warn');
      };
    },
    [log],
  );

  const addItem = () => {
    const id = nextIdRef.current++;
    setItems((previous) => [...previous, { id, name: `Item ${id}` }]);
  };

  const jumpTo = () => {
    const node = nodesRef.current.get(target);
    if (!node) {
      log(`item ${target} is not rendered`, 'error');
      return;
    }
    node.scrollIntoView?.({ block: 'nearest' });
    node.focus();
  };

  return (
    <div className="stack">
      <Panel title="ref as a prop" description="FancyInput reads `ref` from its props.">
        <FancyInput ref={inputRef} label="Fancy input" defaultValue="Select me" />
        <div className="row">
          <Button onClick={() => inputRef.current?.focus()}>Focus</Button>
          <Button onClick={() => inputRef.current?.select()}>Select all</Button>
        </div>
      </Panel>

      <Panel
        title="Ref callback cleanup"
        description="Each row registers its node in a Map and removes it in the returned cleanup."
      >
        <ul className="list" aria-label="Items">
          {items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              register={register}
              onRemove={() =>
                setItems((previous) => previous.filter((entry) => entry.id !== item.id))
              }
            />
          ))}
        </ul>
        <div className="row">
          <Button onClick={addItem}>Add item</Button>
          <label htmlFor={targetId}>Item id</label>
          <input
            id={targetId}
            className="input"
            type="number"
            min={1}
            value={target}
            onChange={(event) => setTarget(Number(event.target.value))}
            style={{ width: '5rem' }}
          />
          <Button onClick={jumpTo}>Scroll to and focus item</Button>
        </div>
        <EventLog entries={entries} onClear={clear} title="Ref callbacks" />
      </Panel>

      <Callout title="Keep ref callbacks stable">
        React calls a ref callback again whenever its identity changes, running the previous cleanup
        first. An inline <code>ref=&#123;(node) =&gt; …&#125;</code> therefore detaches and
        re-attaches on every render. Wrap it in <code>useCallback</code> (or let the React Compiler
        memoise it). Before React 19 there was no cleanup: React called the callback with{' '}
        <code>null</code> instead, which it still does for callbacks that return nothing.
      </Callout>
    </div>
  );
}

interface ItemRowProps {
  item: Item;
  register: (id: number, node: HTMLLIElement) => () => void;
  onRemove: () => void;
}

function ItemRow({ item, register, onRemove }: ItemRowProps) {
  // Stable while `register` and the id are: re-renders do not re-run it.
  const ref = useCallback((node: HTMLLIElement) => register(item.id, node), [register, item.id]);
  return (
    <li ref={ref} tabIndex={-1} className="spread" aria-label={`${item.name} (id ${item.id})`}>
      <span>
        {item.name} <span className="muted small">#{item.id}</span>
      </span>
      <Button size="sm" variant="danger" onClick={onRemove} aria-label={`Remove ${item.name}`}>
        Remove
      </Button>
    </li>
  );
}
