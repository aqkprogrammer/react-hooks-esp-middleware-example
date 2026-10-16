import { Profiler, useState, useSyncExternalStore, type ProfilerOnRenderCallback } from 'react';
import { Button, Callout, Panel, TextField } from '../../../components/ui';
import { filterRows, makeRows } from './workload';
import './performance.css';

const ROWS = makeRows(1000);

interface Sample {
  key: number;
  id: string;
  phase: string;
  actualDuration: number;
  baseDuration: number;
  commitTime: number;
}

/**
 * A tiny external store for profiler samples. `onRender` runs during React's
 * commit; pushing into a store that only the *report* subscribes to avoids
 * the feedback loop you get from calling setState on an ancestor of the
 * profiled tree (each sample would cause another profiled commit).
 */
function createSampleStore(limit = 12) {
  let samples: readonly Sample[] = [];
  let nextKey = 0;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((listener) => listener());
  return {
    push(sample: Omit<Sample, 'key'>) {
      nextKey += 1;
      samples = [{ ...sample, key: nextKey }, ...samples].slice(0, limit);
      emit();
    },
    clear() {
      samples = [];
      emit();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => samples,
  };
}
type SampleStore = ReturnType<typeof createSampleStore>;

export default function ProfilerDemo() {
  const [store] = useState(createSampleStore);
  const onRender: ProfilerOnRenderCallback = (
    id,
    phase,
    actualDuration,
    baseDuration,
    _startTime,
    commitTime,
  ) => store.push({ id, phase, actualDuration, baseDuration, commitTime });

  return (
    <div className="stack">
      <div className="perf-columns">
        <Profiler id="Search panel" onRender={onRender}>
          <SearchPanel />
        </Profiler>
        <Profiler id="Counter" onRender={onRender}>
          <CounterPanel />
        </Profiler>
      </div>
      <ProfilerReport store={store} />
      <Callout title="Development vs production">
        <code>onRender</code> fires in development and in the profiling build (
        <code>react-dom/profiling</code>); it is disabled in normal production builds. Development
        timings are inflated — use them to compare, not as absolute numbers.
      </Callout>
    </div>
  );
}

function SearchPanel() {
  const [query, setQuery] = useState('');
  const rows = filterRows(ROWS, query);
  return (
    <Panel title="Search panel (profiled)">
      <TextField
        label="Profiled search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <p className="small muted">{rows.length} matches</p>
      <ul className="list" aria-label="Profiled results">
        {rows.slice(0, 200).map((row) => (
          <li key={row.id}>{row.name}</li>
        ))}
      </ul>
    </Panel>
  );
}

function CounterPanel() {
  const [count, setCount] = useState(0);
  return (
    <Panel title="Counter (profiled)">
      <Button onClick={() => setCount((value) => value + 1)}>Increment ({count})</Button>
      <p className="small muted">
        A cheap subtree: compare its actualDuration with the search panel.
      </p>
    </Panel>
  );
}

function ProfilerReport({ store }: { store: SampleStore }) {
  const samples = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return (
    <Panel
      title="onRender samples (newest first)"
      description="actualDuration = time spent rendering this commit; baseDuration = estimated cost of re-rendering the whole subtree without memoisation."
    >
      <div className="perf-table-wrap">
        <table className="perf-table">
          <caption className="visually-hidden">Profiler samples</caption>
          <thead>
            <tr>
              <th scope="col">id</th>
              <th scope="col">phase</th>
              <th scope="col">actualDuration</th>
              <th scope="col">baseDuration</th>
              <th scope="col">commitTime</th>
            </tr>
          </thead>
          <tbody>
            {samples.length === 0 ? (
              <tr>
                <td colSpan={5} className="muted">
                  No commits recorded yet.
                </td>
              </tr>
            ) : null}
            {samples.map((sample) => (
              <tr key={sample.key}>
                <td>{sample.id}</td>
                <td>{sample.phase}</td>
                <td className="mono">{sample.actualDuration.toFixed(2)} ms</td>
                <td className="mono">{sample.baseDuration.toFixed(2)} ms</td>
                <td className="mono">{sample.commitTime.toFixed(0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button size="sm" onClick={store.clear} disabled={samples.length === 0}>
        Clear samples
      </Button>
    </Panel>
  );
}
