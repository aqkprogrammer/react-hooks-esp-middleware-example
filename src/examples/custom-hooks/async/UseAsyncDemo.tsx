import { useState } from 'react';
import {
  Badge,
  Button,
  Callout,
  EventLog,
  Panel,
  TextField,
  useEventLog,
} from '../../../components/ui';
import { fetchJson, useAsync } from '../../../hooks';

interface SearchResponse {
  query: string;
  results: string[];
}

/**
 * The mock `/api/search` answers *shorter* queries more slowly, so typing
 * "j" → "ja" → "jav" makes older responses arrive last. `useAsync` aborts
 * them and could never render them anyway.
 */
export default function UseAsyncDemo() {
  const [query, setQuery] = useState('');
  const { entries, log, clear } = useEventLog();
  const q = query.trim();

  const search = useAsync(
    async (signal) => {
      if (!q) return { query: '', results: [] };
      const started = performance.now();
      log(`Request "${q}" started`);
      let settled = false;
      signal.addEventListener('abort', () => {
        if (!settled) log(`Request "${q}" aborted (stale)`, 'warn');
      });
      try {
        const data = await fetchJson<SearchResponse>(`/api/search?q=${encodeURIComponent(q)}`, {
          signal,
        });
        log(`Response "${q}" after ${Math.round(performance.now() - started)} ms`, 'success');
        return data;
      } finally {
        settled = true;
      }
    },
    [q],
  );

  return (
    <div className="stack">
      <Panel
        title="Language search"
        description='Type quickly (e.g. "jav"). Try "error" for a 503.'
      >
        <TextField
          label="Search languages"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoComplete="off"
        />
        <div className="row" aria-live="polite">
          Status: <Badge tone={search.status === 'error' ? 'warn' : 'info'}>{search.status}</Badge>
          {search.status === 'success' && q ? (
            <span className="muted small">
              {search.data.results.length} results for “{search.data.query}”
            </span>
          ) : null}
        </div>
        {search.status === 'error' ? (
          <Callout tone="danger" title="Search failed">
            {search.error.message}{' '}
            <Button size="sm" onClick={search.reload}>
              Retry
            </Button>
          </Callout>
        ) : null}
        {search.status === 'success' && search.data.results.length > 0 ? (
          <ul className="list" aria-label="Results">
            {search.data.results.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        ) : null}
      </Panel>
      <EventLog entries={entries} onClear={clear} title="Requests" />
    </div>
  );
}
