import { fetchJson } from '../../../hooks';

export interface SearchResponse {
  query: string;
  results: string[];
}

/** Queries shorter than this are not sent: one letter matches almost everything. */
export const MIN_QUERY_LENGTH = 2;

function isSearchResponse(value: unknown): value is SearchResponse {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<SearchResponse>;
  return (
    typeof candidate.query === 'string' &&
    Array.isArray(candidate.results) &&
    candidate.results.every((item) => typeof item === 'string')
  );
}

/** Validates the payload instead of trusting a type assertion. */
async function parseSearchResponse(response: Response): Promise<SearchResponse> {
  const body: unknown = await response.json();
  if (!isSearchResponse(body)) throw new TypeError('Unexpected search response shape');
  return body;
}

export function searchUrl(query: string): string {
  return `/api/search?q=${encodeURIComponent(query)}`;
}

/** One search request. `signal` cancels it (and the body read). */
export function searchLanguages(query: string, signal: AbortSignal): Promise<SearchResponse> {
  return fetchJson(searchUrl(query), { signal, parse: parseSearchResponse, timeoutMs: 8000 });
}
