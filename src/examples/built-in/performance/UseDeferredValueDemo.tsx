import { memo, useDeferredValue, useState } from 'react';
import { Badge, Button, Callout, Panel, ScrollArea, TextField } from '../../../components/ui';
import { filterRows, makeRows, simulateWork, type Row } from './workload';
import './performance.css';

const ROWS = makeRows(3000);

/**
 * `useDeferredValue` lets part of the UI lag behind: the input re-renders
 * with the new query immediately, while the slow list re-renders with the
 * deferred query in the background (interruptible) and is dimmed while stale.
 */
export default function UseDeferredValueDemo() {
  const [query, setQuery] = useState('');
  const [deferEnabled, setDeferEnabled] = useState(true);
  const deferredQuery = useDeferredValue(query);
  const listQuery = deferEnabled ? deferredQuery : query;
  const isStale = listQuery !== query;

  return (
    <div className="stack">
      <Panel
        title="Deferred search over 3,000 rows"
        description="Each row is artificially slow. Type quickly: the input stays responsive and the list catches up."
      >
        <TextField
          label="Search people"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="e.g. ada"
        />
        <label className="row small">
          <input
            type="checkbox"
            checked={deferEnabled}
            onChange={(event) => setDeferEnabled(event.target.checked)}
          />
          Render the list with useDeferredValue
        </label>
        <p role="status" className="small">
          {isStale ? (
            <Badge tone="warn">Stale — still showing results for “{listQuery}”</Badge>
          ) : (
            <Badge tone="success">Up to date</Badge>
          )}
        </p>
        <div className={isStale ? 'perf-stale' : undefined} aria-busy={isStale}>
          <SlowResults query={listQuery} />
        </div>
      </Panel>
      <InitialValueExample query={query} />
    </div>
  );
}

/** memo() is essential: without it the list would re-render with the parent on every keystroke anyway. */
const SlowResults = memo(function SlowResults({ query }: { query: string }) {
  const rows = filterRows(ROWS, query);
  return (
    <>
      <p className="small muted">
        {rows.length} matches for “{query}”
      </p>
      <ScrollArea label="Search results">
        <ul className="list" aria-label="Search results">
          {rows.slice(0, 400).map((row) => (
            <SlowRow key={row.id} row={row} />
          ))}
        </ul>
      </ScrollArea>
    </>
  );
});

function SlowRow({ row }: { row: Row }) {
  simulateWork(0.3);
  return <li>{row.name}</li>;
}

function InitialValueExample({ query }: { query: string }) {
  const [mountKey, setMountKey] = useState(0);
  return (
    <Panel
      title="initialValue (React 19)"
      description="useDeferredValue(value, initialValue) renders the cheap initial value first on mount, then the real value in the background."
    >
      <Button onClick={() => setMountKey((key) => key + 1)}>Remount summary</Button>
      <DeferredSummary key={mountKey} query={query} />
      <Callout title="Without initialValue">
        On the first render there is no previous value to fall back to, so the slow content would
        block the initial paint.
      </Callout>
    </Panel>
  );
}

function DeferredSummary({ query }: { query: string }) {
  // `null` is the cheap placeholder for the very first render only.
  const deferredQuery = useDeferredValue<string | null>(query, null);
  if (deferredQuery === null) {
    return <p role="status">Preparing summary…</p>;
  }
  return (
    <div role="status">
      <SlowSummary query={deferredQuery} />
    </div>
  );
}

const SlowSummary = memo(function SlowSummary({ query }: { query: string }) {
  simulateWork(120);
  const count = filterRows(ROWS, query).length;
  return (
    <p>
      Summary ready: {count} people match “{query}”.
    </p>
  );
});
