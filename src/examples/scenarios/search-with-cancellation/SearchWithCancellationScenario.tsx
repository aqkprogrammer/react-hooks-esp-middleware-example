import { useId, useState } from 'react';
import {
  Badge,
  Button,
  Callout,
  EventLog,
  Panel,
  TextField,
  useEventLog,
} from '../../../components/ui';
import { HttpError, useAsync, useDebounce } from '../../../hooks';
import { MIN_QUERY_LENGTH, searchLanguages } from './searchApi';
import './SearchWithCancellationScenario.css';

const DEBOUNCE_OPTIONS = [0, 150, 300, 600] as const;

/**
 * Search-as-you-type against `/api/search`, whose latency is *inverted*
 * (shorter queries answer more slowly), so an older request regularly
 * finishes after a newer one. `useDebounce` limits how many requests start,
 * `useAsync` aborts the previous one and ignores anything it would resolve to.
 */
export default function SearchWithCancellationScenario() {
  const [query, setQuery] = useState('');
  const [debounceMs, setDebounceMs] = useState<number>(300);
  const debounceId = useId();
  const { entries, log, clear } = useEventLog(40);

  const trimmed = query.trim();
  const debouncedQuery = useDebounce(trimmed, debounceMs);
  const canSearch = debouncedQuery.length >= MIN_QUERY_LENGTH;

  const search = useAsync(
    (signal) => {
      const term = debouncedQuery;
      let settled = false;
      log(`→ GET /api/search?q=${term}`);
      signal.addEventListener(
        'abort',
        () => {
          if (!settled) log(`✕ aborted "${term}" — a newer query replaced it`, 'warn');
        },
        { once: true },
      );
      return searchLanguages(term, signal).then(
        (response) => {
          settled = true;
          log(`✓ "${term}" → ${response.results.length} results`, 'success');
          return response;
        },
        (error: unknown) => {
          settled = true;
          if (!signal.aborted) log(`✕ "${term}" failed: ${String(error)}`, 'error');
          throw error;
        },
      );
    },
    [debouncedQuery],
    { enabled: canSearch, keepPreviousData: true },
  );

  const waitingForTyping = trimmed !== debouncedQuery;
  const tooShort = trimmed.length < MIN_QUERY_LENGTH;
  const response = search.status === 'error' ? undefined : search.data;

  let statusText = '';
  if (search.status === 'success') {
    const count = search.data.results.length;
    statusText =
      count === 0
        ? `No languages match “${search.data.query}”`
        : `${count} ${count === 1 ? 'result' : 'results'} for “${search.data.query}”`;
  }

  return (
    <div className="stack">
      <Panel
        title="Search programming languages"
        description={
          <>
            The mocked API answers <em>shorter</em> queries more slowly, so without cancellation an
            older response would overwrite a newer one. Try the debounce at 0 ms and type quickly.
          </>
        }
      >
        <div className="search-with-cancellation-controls">
          <TextField
            label="Search languages"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            hint={`At least ${MIN_QUERY_LENGTH} characters. Try “ja”, “script” or “error”.`}
            autoComplete="off"
            spellCheck={false}
          />
          <div className="field">
            <label className="field-label" htmlFor={debounceId}>
              Debounce
            </label>
            <select
              id={debounceId}
              value={debounceMs}
              onChange={(event) => setDebounceMs(Number(event.target.value))}
            >
              {DEBOUNCE_OPTIONS.map((ms) => (
                <option key={ms} value={ms}>
                  {ms === 0 ? 'Off (0 ms)' : `${ms} ms`}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="row small" aria-hidden="true">
          {waitingForTyping && !tooShort ? <Badge>waiting for typing to pause</Badge> : null}
          {search.status === 'pending' ? <Badge tone="info">request in flight</Badge> : null}
        </div>

        {/* Polite: announced when the screen reader is idle, never mid-keystroke. */}
        <p role="status" className="search-with-cancellation-status">
          {statusText}
        </p>

        {trimmed.length === 0 ? (
          <p className="muted">Start typing to search the language list.</p>
        ) : tooShort ? (
          <p className="muted">Keep typing — searches start at {MIN_QUERY_LENGTH} characters.</p>
        ) : null}

        {search.status === 'pending' && !response && !tooShort ? (
          <p className="muted">Searching…</p>
        ) : null}

        {search.status === 'error' ? (
          <Callout tone="danger" title="Search failed">
            <div className="stack">
              <span role="alert">
                {search.error instanceof HttpError && search.error.status === 503
                  ? 'The search service is unavailable (HTTP 503).'
                  : search.error.message}
              </span>
              <div>
                <Button size="sm" onClick={search.reload}>
                  Retry
                </Button>
              </div>
            </div>
          </Callout>
        ) : null}

        {response && !tooShort ? (
          <div aria-busy={search.status === 'pending'}>
            {response.results.length > 0 ? (
              <ul
                className={[
                  'list',
                  'search-with-cancellation-results',
                  search.status === 'pending' ? 'search-with-cancellation-stale' : '',
                ].join(' ')}
                aria-label={`Results for ${response.query}`}
              >
                {response.results.map((name) => (
                  <li key={name}>
                    <Highlight text={name} term={response.query} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No languages match “{response.query}”.</p>
            )}
          </div>
        ) : null}
      </Panel>

      <Panel
        title="Request log"
        description="Newest first. Stale requests are aborted, never rendered."
      >
        <EventLog entries={entries} onClear={clear} title="Requests" />
      </Panel>
    </div>
  );
}

/** Wraps the first case-insensitive match of `term` in `<mark>`. */
function Highlight({ text, term }: { text: string; term: string }) {
  const index = term ? text.toLowerCase().indexOf(term.toLowerCase()) : -1;
  if (index < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <mark className="search-with-cancellation-mark">
        {text.slice(index, index + term.length)}
      </mark>
      {text.slice(index + term.length)}
    </>
  );
}
