/**
 * INTENTIONALLY BROKEN — shown as text only, never imported or executed.
 * Anti-pattern: fetching in an effect without cleanup. Responses can arrive
 * out of order, so a slow response for an *old* query overwrites the result
 * of the newest one; the request also keeps running after unmount.
 * Corrected version: ../FetchCleanupDemo.tsx
 */
import { useEffect, useState } from 'react';

export function SearchResults({ query }: { query: string }) {
  const [results, setResults] = useState<string[]>([]);

  useEffect(() => {
    // ❌ No AbortController and no "ignore" flag: last response wins,
    // not last request.
    fetch(`/api/search?q=${encodeURIComponent(query)}`)
      .then((response) => response.json())
      .then((data: { results: string[] }) => setResults(data.results));
  }, [query]);

  return (
    <ul>
      {results.map((result) => (
        <li key={result}>{result}</li>
      ))}
    </ul>
  );
}
