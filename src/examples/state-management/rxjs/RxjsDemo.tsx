import { useEffect, useState } from 'react';
import { Panel, TextField, ValueTable, Callout } from '../../../components/ui';
import { createSearchModel } from './searchModel';
import { useObservableValue } from './useObservableValue';

/**
 * RxJS for event streams: debounce, de-duplicate and cancel stale requests
 * with operators, and expose the result to React through
 * `useSyncExternalStore`.
 */
export default function RxjsDemo() {
  const [model] = useState(() => createSearchModel({ debounceMs: 300 }));
  const state = useObservableValue(model.state$);

  useEffect(() => {
    const subscription = model.connect();
    return () => subscription.unsubscribe();
  }, [model]);

  return (
    <div className="stack">
      <Panel
        title="Language search"
        description="debounceTime(300) → distinctUntilChanged → switchMap(fromFetch)"
      >
        <TextField
          label="Search languages"
          hint='Type quickly: only the last value is requested. Try "error".'
          value={state.query}
          onChange={(event) => model.setQuery(event.target.value)}
        />
        <ValueTable
          label="Stream state"
          rows={{ status: state.status, 'requests sent': state.requests }}
        />
        {state.error ? (
          <Callout tone="danger" title="Search failed">
            {state.error}
          </Callout>
        ) : null}
        <ul className="list" aria-label="Results" aria-busy={state.status === 'loading'}>
          {state.status === 'success' && state.results.length === 0 ? (
            <li className="muted">No matches.</li>
          ) : null}
          {state.results.map((result) => (
            <li key={result}>{result}</li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
