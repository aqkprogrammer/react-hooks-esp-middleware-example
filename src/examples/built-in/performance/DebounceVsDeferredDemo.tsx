import { memo, useDeferredValue, useEffect, useState } from 'react';
import { Callout, Panel, RenderCount, ScrollArea, TextField } from '../../../components/ui';
import { filterRows, makeRows, simulateWork } from './workload';
import './performance.css';

const ROWS = makeRows(1500);
const DEBOUNCE_MS = 300;

/**
 * Same input, two strategies:
 * - **Debounce** postpones the work until typing pauses for 300 ms. Fewer
 *   renders (and requests), but the result always lags by at least 300 ms.
 * - **Deferred rendering** starts the work immediately at a lower priority
 *   and abandons it when a newer keystroke arrives. Fast devices update
 *   almost instantly; slow devices simply skip intermediate renders.
 */
export default function DebounceVsDeferredDemo() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, DEBOUNCE_MS);
  const deferredQuery = useDeferredValue(query);

  return (
    <div className="stack">
      <TextField
        label="Filter 1,500 people"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        hint="Type a few letters quickly, then pause."
      />
      <div className="perf-columns">
        <Panel
          title={`Debounced (${DEBOUNCE_MS} ms)`}
          description="Waits for a pause, then renders once."
        >
          <ResultsList label="Debounced list" query={debouncedQuery} />
        </Panel>
        <Panel
          title="useDeferredValue"
          description="Renders right away at low priority; interruptible."
        >
          <ResultsList label="Deferred list" query={deferredQuery} />
        </Panel>
      </div>
      <Callout title="Which one?">
        Use <strong>debounce/throttle</strong> to limit <em>expensive side effects</em> such as
        network requests — rendering priority does not reduce the number of requests. Use{' '}
        <strong>useDeferredValue / useTransition</strong> when the bottleneck is <em>rendering</em>:
        there is no fixed delay and nothing to tune per device. They combine well: debounce the
        fetch, defer the render.
      </Callout>
    </div>
  );
}

/**
 * Minimal debounce, kept local so the demo is self-contained. The timer is
 * cleared whenever `value` changes again or the component unmounts.
 */
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

const ResultsList = memo(function ResultsList({ label, query }: { label: string; query: string }) {
  const rows = filterRows(ROWS, query);
  return (
    <RenderCount label={label}>
      <p className="small">
        {rows.length} matches for “{query}”
      </p>
      <ScrollArea label={label}>
        <ul className="list" aria-label={label}>
          {rows.slice(0, 150).map((row) => (
            <SlowItem key={row.id} name={row.name} />
          ))}
        </ul>
      </ScrollArea>
    </RenderCount>
  );
});

function SlowItem({ name }: { name: string }) {
  simulateWork(0.2);
  return <li>{name}</li>;
}
