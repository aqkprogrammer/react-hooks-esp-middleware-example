import { fetchJson } from '../../../hooks';

export interface FeedProduct {
  id: number;
  name: string;
  category: string;
  price: number;
}

export interface FeedPage {
  items: FeedProduct[];
  page: number;
  totalPages: number;
  total: number;
}

export const PAGE_SIZE = 20;

export interface FeedState {
  items: FeedProduct[];
  /** The page `loadMore` requests next (1-based). */
  nextPage: number;
  hasMore: boolean;
  total: number | null;
  status: 'loading' | 'idle' | 'error';
  error: string | null;
  /** How many items the last successful page added (for the live region). */
  lastAdded: number;
}

export type FeedAction =
  { type: 'start' } | { type: 'success'; page: FeedPage } | { type: 'failure'; message: string };

/** The first page starts loading on mount, so the initial status is `loading`. */
export const initialFeedState: FeedState = {
  items: [],
  nextPage: 1,
  hasMore: true,
  total: null,
  status: 'loading',
  error: null,
  lastAdded: 0,
};

export function feedReducer(state: FeedState, action: FeedAction): FeedState {
  switch (action.type) {
    case 'start':
      return { ...state, status: 'loading', error: null };
    case 'success': {
      const { page } = action;
      // Ignore a page we already have (e.g. a duplicate response).
      if (page.page < state.nextPage) return { ...state, status: 'idle' };
      const known = new Set(state.items.map((item) => item.id));
      const fresh = page.items.filter((item) => !known.has(item.id));
      return {
        items: [...state.items, ...fresh],
        nextPage: page.page + 1,
        hasMore: page.page < page.totalPages,
        total: page.total,
        status: 'idle',
        error: null,
        lastAdded: fresh.length,
      };
    }
    case 'failure':
      return { ...state, status: 'error', error: action.message };
  }
}

export function fetchFeedPage(
  page: number,
  category: string,
  options: { signal: AbortSignal; fail?: boolean },
): Promise<FeedPage> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (category) params.set('category', category);
  if (options.fail) params.set('fail', '1');
  return fetchJson<FeedPage>(`/api/products?${params.toString()}`, { signal: options.signal });
}

export const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
