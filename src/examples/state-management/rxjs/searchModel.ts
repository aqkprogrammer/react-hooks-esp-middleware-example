/**
 * An RxJS "store": a BehaviorSubject holds the current state, a Subject
 * carries user intent, and operators describe timing declaratively.
 *
 * Compared with the original repository's `useStream`
 * (src/esp-demo/common/hooks/useStream.ts), which pushed every subscription
 * into a module-level array and never cleaned up individual streams, this
 * model owns exactly one subscription, returned by `connect()`, and
 * `switchMap` unsubscribes (and aborts) the previous request automatically.
 */
import {
  BehaviorSubject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  of,
  startWith,
  Subject,
  switchMap,
  tap,
  type Observable,
  type Subscription,
} from 'rxjs';
import { fromFetch } from 'rxjs/fetch';

export interface SearchState {
  query: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  results: string[];
  error: string | null;
  /** How many requests actually reached the network. */
  requests: number;
}

export const initialSearchState: SearchState = {
  query: '',
  status: 'idle',
  results: [],
  error: null,
  requests: 0,
};

type Patch = Partial<SearchState>;

function search(query: string): Observable<Patch> {
  return fromFetch(`/api/search?q=${encodeURIComponent(query)}`, {
    // fromFetch aborts the request if the subscriber unsubscribes first.
    selector: async (response) => {
      const body = (await response.json()) as { results?: string[]; message?: string };
      if (!response.ok) throw new Error(body.message ?? `Search failed (${response.status})`);
      return body.results ?? [];
    },
  }).pipe(
    map((results): Patch => ({ status: 'success', results, error: null })),
    startWith<Patch>({ status: 'loading' }),
    catchError((error: unknown) =>
      of<Patch>({
        status: 'error',
        results: [],
        error: error instanceof Error ? error.message : String(error),
      }),
    ),
  );
}

export function createSearchModel({ debounceMs = 300 }: { debounceMs?: number } = {}) {
  const state$ = new BehaviorSubject<SearchState>(initialSearchState);
  const query$ = new Subject<string>();
  const update = (patch: Patch) => state$.next({ ...state$.getValue(), ...patch });

  return {
    /** Read-only view for React (`getValue` + `subscribe`). */
    state$: state$ as Pick<BehaviorSubject<SearchState>, 'getValue' | 'subscribe'>,
    setQuery(query: string) {
      update({ query }); // the input updates immediately...
      query$.next(query); // ...the request is debounced.
    },
    /** Starts the pipeline. Call the returned subscription's `unsubscribe` to stop it. */
    connect(): Subscription {
      return query$
        .pipe(
          map((query) => query.trim()),
          debounceTime(debounceMs),
          distinctUntilChanged(),
          switchMap((query) => {
            if (!query) return of<Patch>({ status: 'idle', results: [], error: null });
            return search(query).pipe(
              tap({ subscribe: () => update({ requests: state$.getValue().requests + 1 }) }),
            );
          }),
        )
        .subscribe(update);
    },
  };
}

export type SearchModel = ReturnType<typeof createSearchModel>;
