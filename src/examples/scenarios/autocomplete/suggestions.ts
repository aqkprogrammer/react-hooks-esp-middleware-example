import { fetchJson } from '../../../hooks';

export interface SuggestionResponse {
  /** The query the server answered (lower-cased and trimmed by the API). */
  query: string;
  results: string[];
}

function isSuggestionResponse(value: unknown): value is SuggestionResponse {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<SuggestionResponse>;
  return (
    typeof candidate.query === 'string' &&
    Array.isArray(candidate.results) &&
    candidate.results.every((item) => typeof item === 'string')
  );
}

async function parse(response: Response): Promise<SuggestionResponse> {
  const body: unknown = await response.json();
  if (!isSuggestionResponse(body)) throw new TypeError('Unexpected suggestion response shape');
  return body;
}

/** GET /api/search; `signal` cancels the request when a newer query supersedes it. */
export function fetchSuggestions(query: string, signal: AbortSignal): Promise<SuggestionResponse> {
  return fetchJson(`/api/search?q=${encodeURIComponent(query)}`, {
    signal,
    parse,
    timeoutMs: 8000,
  });
}

export interface MatchParts {
  before: string;
  match: string;
  after: string;
}

/**
 * Splits `text` around the first case-insensitive occurrence of `query`, so
 * the matching part can be emphasised. `match` is empty when there is none.
 */
export function splitMatch(text: string, query: string): MatchParts {
  const needle = query.trim().toLowerCase();
  const index = needle ? text.toLowerCase().indexOf(needle) : -1;
  if (index === -1) return { before: text, match: '', after: '' };
  return {
    before: text.slice(0, index),
    match: text.slice(index, index + needle.length),
    after: text.slice(index + needle.length),
  };
}

/** Message for the live region: what changed, and how to get to it. */
export function describeResults(count: number, query: string): string {
  if (count === 0) return `No languages match ${query}.`;
  const noun = count === 1 ? 'suggestion' : 'suggestions';
  return `${count} ${noun} available. Use the up and down arrow keys to review them.`;
}
