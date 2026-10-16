import { useEffect, useState } from 'react';
import { Badge, Callout, Panel, TextField } from '../../components/ui';
import './antiPatterns.css';

interface SearchResponse {
  query: string;
  results: string[];
}

/**
 * Corrected version of broken/FetchWithoutCleanup.tsx, side by side with a
 * labelled reproduction of the bug. The mocked /api/search answers *shorter*
 * queries more slowly, so typing quickly makes responses arrive out of order.
 */
export default function FetchCleanupDemo() {
  const [query, setQuery] = useState('');
  return (
    <div className="stack">
      <TextField
        label="Search languages"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        hint="Type “ja” then quickly “v”: the “ja” response is slower and arrives last."
      />
      <div className="ap-columns">
        <Panel title="Without cleanup (bug reproduction)">
          <NaiveResults query={query} />
        </Panel>
        <Panel title="With AbortController cleanup">
          <AbortableResults query={query} />
        </Panel>
      </div>
      <Callout title="Better still: a data-fetching library">
        Cleanup fixes races, but caching, deduplication and retries are easier with TanStack Query
        or SWR (both installed in this playground), or with <code>use</code> and a cache.
      </Callout>
    </div>
  );
}

function ResultView({ query, data }: { query: string; data: SearchResponse | null }) {
  if (!query) return <p className="muted">Type to search.</p>;
  if (!data) return <p role="status">Loading…</p>;
  const stale = data.query !== query;
  return (
    <div className="stack">
      <p role="status">
        Showing results for “{data.query}”{' '}
        {stale ? (
          <Badge tone="warn">stale: you typed “{query}”</Badge>
        ) : (
          <Badge tone="success">current</Badge>
        )}
      </p>
      <ul className="list">
        {data.results.map((result) => (
          <li key={result}>{result}</li>
        ))}
      </ul>
    </div>
  );
}

/** Bug reproduction: whichever response arrives *last* wins. */
function NaiveResults({ query }: { query: string }) {
  const [data, setData] = useState<SearchResponse | null>(null);
  useEffect(() => {
    if (!query) return;
    fetch(`/api/search?q=${encodeURIComponent(query)}`)
      .then((response) => response.json() as Promise<SearchResponse>)
      .then((body) => setData(body));
  }, [query]);
  return <ResultView query={query} data={data} />;
}

/** Fix: abort the previous request when the query changes or the component unmounts. */
function AbortableResults({ query }: { query: string }) {
  const [data, setData] = useState<SearchResponse | null>(null);
  useEffect(() => {
    if (!query) return;
    const controller = new AbortController();
    fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
      .then((response) => response.json() as Promise<SearchResponse>)
      .then(
        (body) => setData(body),
        (error: unknown) => {
          if (!controller.signal.aborted) throw error;
        },
      );
    return () => controller.abort();
  }, [query]);
  return <ResultView query={query} data={data} />;
}
