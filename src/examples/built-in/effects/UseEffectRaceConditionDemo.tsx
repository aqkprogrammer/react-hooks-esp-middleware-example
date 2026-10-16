import { useEffect, useState } from 'react';
import { Badge, Callout, EventLog, Panel, TextField, useEventLog } from '../../../components/ui';

type Log = (message: string, tone?: 'info' | 'success' | 'warn' | 'error') => void;

interface SearchResponse {
  query: string;
  results: string[];
}

/** The last response this panel applied — loading/error are derived from it. */
interface Applied {
  query: string;
  results: string[];
  error: string | null;
}

async function readSearch(response: Response): Promise<SearchResponse> {
  const body = (await response.json()) as Partial<SearchResponse> & { message?: string };
  if (!response.ok) throw new Error(body.message ?? `HTTP ${response.status}`);
  return { query: body.query ?? '', results: body.results ?? [] };
}

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * `/api/search` answers *shorter* queries more slowly, so typing "j" → "ja"
 * → "jav" makes the "j" response arrive last. The left panel shows it
 * anyway; the right one aborts superseded requests in the effect cleanup.
 */
export default function UseEffectRaceConditionDemo() {
  const [query, setQuery] = useState('');
  const { entries, log, clear } = useEventLog(40);
  return (
    <div className="stack">
      <TextField
        label="Search languages"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        hint='Type "jav" quickly. Shorter queries respond more slowly.'
        autoComplete="off"
      />
      <div className="grid">
        <Panel title="Bug: no cleanup" description="Whichever response arrives last wins.">
          <BuggySearch query={query} log={log} />
        </Panel>
        <Panel
          title="Fix: AbortController in the cleanup"
          description="Only the latest query can win."
        >
          <FixedSearch query={query} log={log} />
        </Panel>
      </div>
      <Panel title="Network log">
        <EventLog entries={entries} onClear={clear} title="Requests" />
      </Panel>
      <Callout title="Two ways to fix it">
        Abort the request in the cleanup (frees the network and the server), or set an{' '}
        <code>ignore</code> flag in the cleanup and check it before calling <code>setState</code>{' '}
        (works for any promise). The fixed panel does both. Libraries such as TanStack Query and SWR
        handle this for you.
      </Callout>
    </div>
  );
}

function BuggySearch({ query, log }: { query: string; log: Log }) {
  const [applied, setApplied] = useState<Applied>({ query: '', results: [], error: null });

  useEffect(() => {
    if (!query) return;
    log(`bug: GET ?q=${query}`);
    fetch(`/api/search?q=${encodeURIComponent(query)}`)
      .then(readSearch)
      .then((data) => {
        // No check: a slow, outdated response overwrites a newer one.
        log(`bug: applied "${query}"`, 'warn');
        setApplied({ query, results: data.results, error: null });
      })
      .catch((error: unknown) => setApplied({ query, results: [], error: errorMessage(error) }));
  }, [query, log]);

  return (
    <ResultView
      prefix="Buggy"
      query={query}
      applied={applied}
      mismatch="does not match the input"
    />
  );
}

function FixedSearch({ query, log }: { query: string; log: Log }) {
  const [applied, setApplied] = useState<Applied>({ query: '', results: [], error: null });

  useEffect(() => {
    if (!query) return;
    const controller = new AbortController();
    let ignore = false;
    log(`fixed: GET ?q=${query}`);
    fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
      .then(readSearch)
      .then((data) => {
        if (ignore) return;
        log(`fixed: applied "${query}"`, 'success');
        setApplied({ query, results: data.results, error: null });
      })
      .catch((error: unknown) => {
        if (ignore || controller.signal.aborted) return; // superseded, not a failure
        setApplied({ query, results: [], error: errorMessage(error) });
      });
    return () => {
      ignore = true;
      controller.abort();
      log(`fixed: aborted "${query}"`);
    };
  }, [query, log]);

  return <ResultView prefix="Fixed" query={query} applied={applied} mismatch="loading…" />;
}

interface ResultViewProps {
  prefix: string;
  query: string;
  applied: Applied;
  /** Badge shown while the applied response is for a different query. */
  mismatch: string;
}

function ResultView({ prefix, query, applied, mismatch }: ResultViewProps) {
  // Derived, not stored: compare the last applied response with the input.
  // In the fixed panel a mismatch can only mean the latest request is in
  // flight; in the buggy panel it may be a stale response that won the race.
  const visible: Applied = query ? applied : { query: '', results: [], error: null };
  const mismatched = query !== '' && applied.query !== query;
  return (
    <section className="stack" aria-label={`${prefix} results`}>
      <p className="row">
        Showing results for{' '}
        <strong className="mono">{visible.query ? `"${visible.query}"` : '—'}</strong>
        {mismatched ? <Badge tone="warn">{mismatch}</Badge> : null}
      </p>
      {visible.error ? (
        <p className="field-error" role="alert">
          {visible.error}
        </p>
      ) : (
        <ul className="list" aria-label={`${prefix} result list`}>
          {visible.results.length === 0 ? <li className="muted">No results</li> : null}
          {visible.results.map((result) => (
            <li key={result}>{result}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
