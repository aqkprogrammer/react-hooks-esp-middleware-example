import { useEffect, useState } from 'react';
import {
  Button,
  Callout,
  EventLog,
  Panel,
  RenderCount,
  TextField,
  useEventLog,
} from '../../../components/ui';
import { languages } from '../../../mocks/data';

type Log = (message: string, tone?: 'info' | 'success' | 'warn' | 'error') => void;

/**
 * Two effects that should not exist: one that copies derived data into state,
 * and one that reacts to state to do something that belongs to an event.
 */
export default function YouMightNotNeedAnEffectDemo() {
  return (
    <div className="stack">
      <h3 className="panel-title">1. Derive data during render</h3>
      <div className="grid">
        <Panel title="Effect + state (avoid)" description="Every keystroke commits twice.">
          <RenderCount label="Effect filter">
            <EffectFilter />
          </RenderCount>
        </Panel>
        <Panel title="Computed in render" description="One commit per keystroke.">
          <RenderCount label="Derived filter">
            <DerivedFilter />
          </RenderCount>
        </Panel>
      </div>

      <h3 className="panel-title">2. Put event logic in the event handler</h3>
      <EventVsEffect />

      <Callout title="Ask: why does this code run?">
        If it runs because the component was <em>displayed</em> (synchronise with a server,
        subscribe, connect) it is an effect. If it runs because the user <em>did something</em>{' '}
        (clicked, submitted) it belongs in that event handler. If it only computes a value from
        props/state, compute it during render.
      </Callout>
    </div>
  );
}

function EffectFilter() {
  const [query, setQuery] = useState('');
  const [visible, setVisible] = useState<readonly string[]>(languages);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate anti-pattern: shows the extra commit this causes
    setVisible(languages.filter((name) => name.toLowerCase().includes(query.toLowerCase())));
  }, [query]);

  return (
    <FilterView label="Filter (effect)" query={query} onQueryChange={setQuery} visible={visible} />
  );
}

function DerivedFilter() {
  const [query, setQuery] = useState('');
  // Cheap enough to recompute every render. Reach for useMemo only if a
  // profile shows this is slow.
  const visible = languages.filter((name) => name.toLowerCase().includes(query.toLowerCase()));
  return (
    <FilterView label="Filter (derived)" query={query} onQueryChange={setQuery} visible={visible} />
  );
}

function FilterView({
  label,
  query,
  onQueryChange,
  visible,
}: {
  label: string;
  query: string;
  onQueryChange: (query: string) => void;
  visible: readonly string[];
}) {
  return (
    <div className="stack">
      <TextField
        label={label}
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
      />
      <p className="small muted">
        {visible.length} match{visible.length === 1 ? '' : 'es'}: {visible.slice(0, 6).join(', ')}
        {visible.length > 6 ? '…' : ''}
      </p>
    </div>
  );
}

function EventVsEffect() {
  const { entries, log, clear } = useEventLog(20);
  return (
    <div className="stack">
      <div className="grid">
        <Panel
          title="Notification in an effect (avoid)"
          description="Reacts to any change of the count."
        >
          <EffectCart log={log} />
        </Panel>
        <Panel title="Notification in the handler" description="Runs only when the user adds.">
          <HandlerCart log={log} />
        </Panel>
      </div>
      <EventLog entries={entries} onClear={clear} title="Notifications" />
      <p className="muted small">
        Click <em>Restore saved cart</em> in both panels: only the effect version claims the user
        just added something.
      </p>
    </div>
  );
}

const SAVED_CART_COUNT = 3;

function EffectCart({ log }: { log: Log }) {
  const [count, setCount] = useState(0);
  // Fires for *every* reason count changes — including restoring a saved cart.
  useEffect(() => {
    if (count > 0) log(`effect: "Added to cart!" (count ${count})`, 'warn');
  }, [count, log]);
  return (
    <CartControls
      prefix="effect"
      count={count}
      onAdd={() => setCount((c) => c + 1)}
      onRestore={() => setCount(SAVED_CART_COUNT)}
    />
  );
}

function HandlerCart({ log }: { log: Log }) {
  const [count, setCount] = useState(0);
  return (
    <CartControls
      prefix="handler"
      count={count}
      onAdd={() => {
        setCount(count + 1);
        log(`handler: "Added to cart!" (count ${count + 1})`, 'success');
      }}
      onRestore={() => setCount(SAVED_CART_COUNT)}
    />
  );
}

function CartControls({
  prefix,
  count,
  onAdd,
  onRestore,
}: {
  prefix: string;
  count: number;
  onAdd: () => void;
  onRestore: () => void;
}) {
  return (
    <div className="stack">
      <p aria-label={`${prefix} cart`}>Cart: {count} item(s)</p>
      <div className="row">
        <Button variant="primary" onClick={onAdd} aria-label={`Add to cart (${prefix})`}>
          Add to cart
        </Button>
        <Button onClick={onRestore} aria-label={`Restore saved cart (${prefix})`}>
          Restore saved cart
        </Button>
      </div>
    </div>
  );
}
