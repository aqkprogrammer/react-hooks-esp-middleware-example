import { useEffect, useId, useMemo, useRef, useState, type RefObject } from 'react';
import { Button, Callout, Panel, RenderCount, TextField, ValueTable } from '../../../components/ui';
import { makeRows, rankRows, type Row } from './workload';

const ROWS = makeRows(5000);
const SERVER_URL = 'wss://chat.example.invalid';

/**
 * Part 1: an expensive *pure* calculation, measured two ways — Profiler
 * render time (RenderCount) and a one-off `performance.now()` benchmark in an
 * event handler. Part 2: `useMemo` keeping an object referentially stable so
 * an effect that depends on it does not re-run.
 */
export default function UseMemoDemo() {
  return (
    <div className="stack">
      <ExpensiveCalculation />
      <EffectDependency />
    </div>
  );
}

function ExpensiveCalculation() {
  const [query, setQuery] = useState('');
  const [cost, setCost] = useState(300);
  const [skipMemo, setSkipMemo] = useState(false);
  const [unrelated, setUnrelated] = useState(0);
  const [benchmarkMs, setBenchmarkMs] = useState<number | null>(null);
  const costId = useId();

  return (
    <Panel
      title="Expensive calculation"
      description="Ranks 5,000 rows. Click “Unrelated re-render” and compare the render time with and without useMemo."
    >
      <div className="row">
        <TextField
          label="Filter"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="e.g. grace or docs"
        />
        <div className="field">
          <label className="field-label" htmlFor={costId}>
            Work per row: {cost} rounds
          </label>
          <input
            id={costId}
            type="range"
            min={0}
            max={1500}
            step={100}
            value={cost}
            onChange={(event) => setCost(Number(event.target.value))}
          />
        </div>
      </div>
      <div className="row">
        <label className="row small">
          <input
            type="checkbox"
            checked={skipMemo}
            onChange={(event) => setSkipMemo(event.target.checked)}
          />
          Skip useMemo (recalculate on every render)
        </label>
        <Button onClick={() => setUnrelated((value) => value + 1)}>
          Unrelated re-render ({unrelated})
        </Button>
        <Button
          onClick={() => {
            // Event handlers may be impure, so timing with performance.now() is fine here.
            const start = performance.now();
            rankRows(ROWS, query, cost);
            setBenchmarkMs(performance.now() - start);
          }}
        >
          Benchmark one calculation
        </Button>
      </div>
      <ValueTable
        rows={{
          Memoisation: skipMemo ? 'off — runs every render' : 'on — runs when query/cost change',
          'One calculation (performance.now)':
            benchmarkMs === null ? 'not measured yet' : `${benchmarkMs.toFixed(1)} ms`,
        }}
      />
      <RenderCount label="RankedRows">
        <RankedRows query={query} cost={cost} skipMemo={skipMemo} unrelated={unrelated} />
      </RenderCount>
      <Callout title="Measure before memoising">
        If one calculation takes well under a millisecond, <code>useMemo</code> only adds
        bookkeeping. Profile with CPU throttling, and remember the dev build is slower than
        production.
      </Callout>
    </Panel>
  );
}

interface RankedRowsProps {
  query: string;
  cost: number;
  skipMemo: boolean;
  unrelated: number;
}

function RankedRows({ query, cost, skipMemo, unrelated }: RankedRowsProps) {
  // Always call useMemo (Rules of Hooks); when memoisation is "off" it returns
  // null and the calculation runs inline on every render instead.
  const memoised = useMemo(
    () => (skipMemo ? null : rankRows(ROWS, query, cost)),
    [skipMemo, query, cost],
  );
  const ranked: Row[] = memoised ?? rankRows(ROWS, query, cost);
  return (
    <div className="stack">
      <p className="small muted">
        {ranked.length} matching rows · parent re-render #{unrelated}
      </p>
      <ol className="list" aria-label="Top ranked rows">
        {ranked.slice(0, 5).map((row) => (
          <li key={row.id}>
            {row.name} <span className="muted small">({row.team})</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

interface ConnectionOptions {
  roomId: string;
  serverUrl: string;
}

/**
 * Stand-in for "connect to the chat server with these options". The run count
 * is written to the DOM, not to state, so measuring never causes a render.
 */
function useConnectionCounter(
  options: ConnectionOptions,
  runsRef: RefObject<number>,
  outputRef: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    runsRef.current += 1;
    if (outputRef.current) outputRef.current.textContent = String(runsRef.current);
  }, [options, runsRef, outputRef]);
}

function EffectDependency() {
  const [roomId, setRoomId] = useState('general');
  const [draft, setDraft] = useState('');
  const [memoiseOptions, setMemoiseOptions] = useState(true);
  const runsRef = useRef(0);
  const outputRef = useRef<HTMLSpanElement>(null);
  const roomFieldId = useId();

  const memoisedOptions = useMemo(() => ({ roomId, serverUrl: SERVER_URL }), [roomId]);
  // Without useMemo the object literal is a *new* object on every render.
  // Passing it through a custom hook hides the problem from exhaustive-deps,
  // which is exactly why it slips into real code.
  useConnectionCounter(
    memoiseOptions ? memoisedOptions : { roomId, serverUrl: SERVER_URL },
    runsRef,
    outputRef,
  );

  return (
    <Panel
      title="Referential equality as an effect dependency"
      description="The effect depends on an options object. Type in the draft field: only the memoised object stays the same between renders."
    >
      <div className="row">
        <div className="field">
          <label className="field-label" htmlFor={roomFieldId}>
            Room
          </label>
          <select
            id={roomFieldId}
            value={roomId}
            onChange={(event) => setRoomId(event.target.value)}
          >
            <option value="general">general</option>
            <option value="random">random</option>
          </select>
        </div>
        <TextField
          label="Draft message (unrelated state)"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
      </div>
      <label className="row small">
        <input
          type="checkbox"
          checked={memoiseOptions}
          onChange={(event) => setMemoiseOptions(event.target.checked)}
        />
        Memoise the options object with useMemo
      </label>
      <p>
        Effect runs (reconnects): <strong ref={outputRef}>0</strong>
      </p>
      <Callout tone="success" title="Often better than useMemo">
        Create the object <em>inside</em> the effect and depend on the primitives:{' '}
        <code>
          useEffect(() =&gt; connect({'{'} roomId, serverUrl {'}'}), [roomId])
        </code>
        .
      </Callout>
    </Panel>
  );
}
