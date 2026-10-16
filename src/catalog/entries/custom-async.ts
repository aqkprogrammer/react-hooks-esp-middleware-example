import type { CatalogEntry, DocLink } from '../types';

const CATEGORY = 'Data fetching & async';

const TANSTACK: DocLink = { label: 'TanStack Query', url: 'https://tanstack.com/query/latest' };
const SWR: DocLink = { label: 'SWR', url: 'https://swr.vercel.app/' };
const FETCHING_WITH_EFFECTS: DocLink = {
  label: 'Fetching data with Effects',
  url: 'https://react.dev/reference/react/useEffect#fetching-data-with-effects',
};
const ABORT_CONTROLLER: DocLink = {
  label: 'MDN: AbortController',
  url: 'https://developer.mozilla.org/en-US/docs/Web/API/AbortController',
};

/** Shared advice: these hooks teach the mechanics; server state belongs in a cache library. */
const USE_A_LIBRARY =
  'Production server state (caching, deduplication, background refetch, SSR hydration) — use [TanStack Query](https://tanstack.com/query/latest), [SWR](https://swr.vercel.app/) or your framework’s data loader (Next.js, React Router).';

export const entries: CatalogEntry[] = [
  {
    id: 'use-async',
    title: 'useAsync',
    section: 'custom',
    category: CATEGORY,
    level: 'intermediate',
    summary:
      'Run a promise-returning function when deps change, with abort, stale-result protection and a typed status union.',
    tags: [
      'async',
      'promise',
      'AbortSignal',
      'race condition',
      'discriminated union',
      'loading state',
    ],
    demo: 'examples/custom-hooks/async/UseAsyncDemo.tsx',
    sources: ['hooks/async/useAsync.ts', 'hooks/async/fetchJson.ts', 'hooks/state/useLatest.ts'],
    tests: [
      'hooks/async/useAsync.test.tsx',
      'hooks/async/async.ssr.test.tsx',
      'examples/custom-hooks/async/AsyncDemos.test.tsx',
    ],
    minReact: '16.8',
    support: {
      level: 'universal',
      notes: 'Renders `pending` on the server; runs only in the browser.',
    },
    officialDocs: [
      FETCHING_WITH_EFFECTS,
      {
        label: 'Adjusting state when a prop changes',
        url: 'https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes',
      },
      ABORT_CONTROLLER,
    ],
    related: ['use-fetch', 'use-async-fn', 'use-latest'],
    concept:
      'Calls `fn(signal)` after every commit in which `deps` changed and exposes `{ status: "idle" | "pending" | "success" | "error", data, error }` as a discriminated union. The previous run’s signal is aborted, and an aborted run can never write state.',
    problem:
      'Hand-written fetch effects show stale responses when inputs change quickly (a slow old request finishes last), set state after unmount, forget to abort, and model loading/error/data as three loosely related booleans.',
    whenToUse: [
      'Any async value derived from props/state: a search, a detail view, a computed report.',
      'Composing several requests (`Promise.all`) under one status and one abort signal.',
    ],
    whenNotToUse: [
      USE_A_LIBRARY,
      'User-triggered actions (submit, delete) — use `useAsyncFn`, which runs only when called.',
    ],
    api: {
      signature:
        'function useAsync<T>(fn: (signal: AbortSignal) => Promise<T>, deps: DependencyList, options?: { enabled?: boolean; keepPreviousData?: boolean }): AsyncState<T> & { reload: () => void }',
      params: [
        {
          name: 'fn',
          type: '(signal: AbortSignal) => Promise<T>',
          description: 'May be inline; the latest is called. Pass `signal` to `fetch`.',
        },
        {
          name: 'deps',
          type: 'DependencyList',
          description: 'Re-run when any item changes (`Object.is`). List every value `fn` reads.',
        },
        {
          name: 'options.enabled',
          type: 'boolean',
          description: '`false` → `idle`, aborts in-flight work. Default `true`.',
          optional: true,
        },
        {
          name: 'options.keepPreviousData',
          type: 'boolean',
          description: 'Keep the last `data` while pending. Default `false`.',
          optional: true,
        },
      ],
      returns:
        'The state union plus a stable `reload()`. Narrow on `status`: in `success`, `data` is `T`; in `error`, `error` is an `Error`.',
    },
    execution: [
      'Render: deps are compared with the previous render; a change bumps a version (render-time state adjustment), so this render already reports `pending`.',
      'Effect (keyed on the version): a new `AbortController` is created and `fn(signal)` called.',
      'Settle: the result is stored only if the signal was not aborted.',
      'Cleanup (deps change, `reload`, disable, unmount): the controller aborts — late results are dropped.',
    ],
    mistakes: [
      {
        title: 'Ignoring out-of-order responses',
        wrong:
          'useEffect(() => {\n  fetch(`/api/search?q=${q}`)\n    .then((r) => r.json())\n    .then(setResults);\n}, [q]);',
        why: 'If “ja” answers after “jav”, the UI shows results for “ja” while the input says “jav”.',
        right:
          'const results = useAsync(\n  (signal) => fetchJson(`/api/search?q=${q}`, { signal }),\n  [q],\n);',
      },
      {
        title: 'Three independent flags',
        wrong:
          'const [loading, setLoading] = useState(false);\nconst [error, setError] = useState(null);\nconst [data, setData] = useState(null);',
        why: 'Impossible combinations (loading with an error and stale data) become representable and render bugs follow.',
      },
    ],
    edgeCases: [
      'Synchronous throws inside `fn` become an `error` state.',
      'In Strict Mode development the effect runs twice; the first run is aborted immediately.',
      'Errors are normalised to `Error` instances (strings and objects are wrapped).',
    ],
    testing:
      'Tests force races with deferred promises, assert `signal.aborted` on deps change and unmount, prove no state updates after unmount, and cover `enabled`, `reload` and `keepPreviousData`.',
    production: [
      'Pass the signal all the way to `fetch` so aborted requests stop using bandwidth.',
      'Prefer a cache library once several components need the same data.',
    ],
    diagram: {
      title: 'Status transitions',
      description: 'The discriminated union and what moves between states.',
      mermaid: `stateDiagram-v2
  [*] --> idle: enabled=false
  [*] --> pending: enabled
  idle --> pending: enabled=true
  pending --> success: resolved, not aborted
  pending --> error: rejected, not aborted
  success --> pending: deps change or reload
  error --> pending: deps change or reload
  pending --> pending: deps change, previous aborted
  pending --> idle: enabled=false`,
    },
  },
  {
    id: 'use-async-fn',
    title: 'useAsyncFn',
    section: 'custom',
    category: CATEGORY,
    level: 'intermediate',
    summary:
      'Imperative async calls (submit, mutate) with latest-call-wins, cancel and a never-rejecting execute().',
    tags: ['async', 'mutation', 'submit', 'cancel', 'latest call wins', 'AbortSignal'],
    demo: 'examples/custom-hooks/async/UseAsyncFnDemo.tsx',
    sources: ['hooks/async/useAsyncFn.ts', 'hooks/async/fetchJson.ts'],
    tests: [
      'hooks/async/useAsyncFn.test.tsx',
      'examples/custom-hooks/async/UseAsyncFnDemo.test.tsx',
    ],
    minReact: '16.8',
    support: { level: 'universal' },
    officialDocs: [ABORT_CONTROLLER, FETCHING_WITH_EFFECTS],
    related: ['use-async', 'use-retry', 'use-request'],
    concept:
      'Holds an `AsyncState` and an `execute(...args)` function. Each call aborts the previous one; only the latest call can update state. `execute` resolves with `{ status: "success" | "error" | "aborted" }` and never rejects.',
    problem:
      'Event-handler requests need the same care as effects — double submits, out-of-order responses, unmount mid-request — plus a way to await the result without unhandled rejections.',
    whenToUse: [
      'Form submits, button-triggered mutations, “load on click”.',
      'Searches triggered by the user rather than derived from state.',
    ],
    whenNotToUse: [
      'Data that should load from props/state — use `useAsync` / `useFetch`.',
      'Mutations that must update cached server data everywhere — use TanStack Query’s `useMutation` or SWR’s `mutate`, or React 19 Actions (`useActionState`) for forms.',
    ],
    api: {
      signature:
        'function useAsyncFn<T, Args extends unknown[] = []>(fn: (signal: AbortSignal, ...args: Args) => Promise<T>): AsyncState<T> & { execute: (...args: Args) => Promise<AsyncFnOutcome<T>>; cancel: () => void; reset: () => void }',
      params: [
        {
          name: 'fn',
          type: '(signal, ...args) => Promise<T>',
          description: 'The latest function is used; may be inline.',
        },
      ],
      returns:
        'State union (starts `idle`) plus stable `execute`, `cancel` (abort and restore the last settled state) and `reset` (abort and go `idle`).',
    },
    execution: [
      '`execute`: aborts the previous controller, sets `pending` (keeping previous data) and calls `fn`.',
      'Settle: ignored if the signal was aborted; otherwise `success`/`error` and the outcome is returned.',
      'Unmount: the in-flight controller is aborted.',
    ],
    mistakes: [
      {
        title: 'Unhandled rejections from event handlers',
        wrong: 'onClick={async () => {\n  await save(draft); // throws → unhandled rejection\n}}',
        why: 'Nothing catches the rejection; the error surfaces only in the console.',
        right:
          "onClick={async () => {\n  const outcome = await save.execute(draft);\n  if (outcome.status === 'success') navigate('/done');\n}}",
      },
    ],
    edgeCases: [
      'Aborting stops the client from waiting; a POST that reached the server may still be applied — make mutations idempotent.',
      '`cancel()` with nothing in flight is a no-op.',
    ],
    testing:
      'Tests use MSW with per-query delays to make the first response arrive last, verify that the superseded call resolves `aborted`, and check cancel, reset, error outcomes and abort on unmount.',
    production: [
      'Disable the submit button while `pending` and send an idempotency key with POSTs.',
    ],
  },
  {
    id: 'use-fetch',
    title: 'useFetch',
    section: 'custom',
    category: CATEGORY,
    level: 'intermediate',
    summary:
      'Declarative fetch with abort on change/unmount, timeouts, typed JSON and typed HTTP errors.',
    tags: ['fetch', 'http', 'timeout', 'HttpError', 'abort', 'stale response', 'json'],
    demo: 'examples/custom-hooks/async/UseFetchDemo.tsx',
    sources: [
      'hooks/async/useFetch.ts',
      'hooks/async/fetchJson.ts',
      'hooks/async/errors.ts',
      'hooks/async/useAsync.ts',
    ],
    tests: [
      'hooks/async/useFetch.test.tsx',
      'hooks/async/async.ssr.test.tsx',
      'examples/custom-hooks/async/UseFetchDemo.test.tsx',
    ],
    minReact: '16.8',
    support: { level: 'universal', notes: 'Does not fetch during SSR (effects do not run).' },
    officialDocs: [
      {
        label: 'MDN: Fetch API',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API',
      },
      FETCHING_WITH_EFFECTS,
      TANSTACK,
      SWR,
    ],
    related: ['use-async', 'use-retry', 'use-request'],
    concept:
      '`useAsync` + `fetchJson`: fetches `url` whenever the request (URL, method, headers, string body, timeout) changes. Non-2xx responses become `HttpError` (with `status` and parsed `body`), timeouts `TimeoutError`, network failures the `TypeError` from `fetch`.',
    problem:
      '`fetch` resolves on 404/500, has no timeout, needs manual abort wiring, and `response.json()` is untyped — every component re-implements the same error-prone glue.',
    whenToUse: [
      'Simple read-only data for one component: a detail view, a settings page, a demo.',
      'Learning what a data library has to handle.',
    ],
    whenNotToUse: [
      USE_A_LIBRARY,
      'Imperative requests — use `useAsyncFn` with `fetchJson`.',
      'A separate `useAbortableFetch` is intentionally not provided: `useFetch` always aborts on change and unmount, and `useAsyncFn` covers the imperative case.',
    ],
    api: {
      signature:
        'function useFetch<T = unknown>(url: string | null, options?: { init?: RequestInit; parse?: (response: Response) => Promise<T>; timeoutMs?: number; enabled?: boolean; keepPreviousData?: boolean }): AsyncState<T> & { reload: () => void }',
      params: [
        { name: 'url', type: 'string | null', description: '`null` skips fetching (`idle`).' },
        {
          name: 'options.init',
          type: 'RequestInit',
          description:
            'Method, headers, body… (`signal` is managed). New object identities do not refetch.',
          optional: true,
        },
        {
          name: 'options.parse',
          type: '(response) => Promise<T>',
          description:
            'Default: JSON, `undefined` for empty bodies. A type assertion — validate untrusted data here.',
          optional: true,
        },
        {
          name: 'options.timeoutMs',
          type: 'number',
          description: 'Abort and fail with `TimeoutError`.',
          optional: true,
        },
      ],
      returns: 'The `useAsync` result.',
    },
    execution: [
      'Render: a request key is derived from URL, method, headers, string body and timeout.',
      'Effect: `fetchJson` runs with the hook’s signal (plus a timeout timer).',
      'Change/unmount: the request is aborted; its response can never be rendered.',
    ],
    mistakes: [
      {
        title: 'Treating 404/500 as success',
        wrong: "const data = await fetch('/api/users/9').then((r) => r.json());",
        why: '`fetch` only rejects on network failure; an error page is parsed as data.',
        right: "const data = await fetchJson<User>('/api/users/9'); // throws HttpError(404)",
      },
      {
        title: 'Passing a fresh init object as a dependency',
        wrong:
          'useEffect(() => { fetch(url, init) }, [url, init]); // init = { headers: {...} } inline',
        why: 'A new object every render refetches every render — an infinite loop if the result sets state.',
      },
    ],
    edgeCases: [
      'FormData/Blob bodies are not part of the request key — call `reload()` after changing them.',
      'Timeouts cover reading the body too, not just the headers.',
    ],
    testing:
      'MSW tests cover typed JSON, `HttpError` status/body, network errors (`HttpResponse.error()`), timeouts, the URL-switching race with `delay()`, abort on unmount (the request’s `signal.aborted`), and refetch rules for `init`.',
    production: [
      'Validate response shapes at the boundary (`parse` with a schema).',
      'Set timeouts: a hung request otherwise spins forever.',
    ],
  },
  {
    id: 'use-request',
    title: 'useRequest',
    section: 'custom',
    category: CATEGORY,
    level: 'advanced',
    summary:
      'A minimal stale-while-revalidate cache: shared by key, deduplicated, with optimistic mutate.',
    tags: [
      'cache',
      'stale-while-revalidate',
      'deduplication',
      'mutate',
      'optimistic update',
      'useSyncExternalStore',
    ],
    demo: 'examples/custom-hooks/async/UseRequestDemo.tsx',
    sources: ['hooks/async/useRequest.ts'],
    tests: [
      'hooks/async/useRequest.test.tsx',
      'hooks/async/async.ssr.test.tsx',
      'examples/custom-hooks/async/AsyncDemos.test.tsx',
    ],
    minReact: '18.0',
    support: {
      level: 'universal',
      notes: 'Never reads the shared cache on the server (no cross-request leaks).',
    },
    officialDocs: [
      {
        label: 'useSyncExternalStore',
        url: 'https://react.dev/reference/react/useSyncExternalStore',
      },
      SWR,
      TANSTACK,
    ],
    related: ['use-fetch', 'use-resource', 'use-async-fn'],
    concept:
      'A per-key cache entry `{ data, error, updatedAt, isValidating }` read through `useSyncExternalStore`. Concurrent requests for a key share one promise; cached data renders instantly and is revalidated when older than `staleTimeMs`; `mutate` writes locally and wins over responses that started earlier.',
    problem:
      '`useFetch` in five components means five requests and five loading spinners. Sharing, deduplicating and optimistic updates are what SWR/TanStack Query do — this hook shows the core mechanics in ~150 lines.',
    whenToUse: [
      'Learning and teaching how SWR-style caches work.',
      'Tiny apps or prototypes where a dependency is not wanted.',
    ],
    whenNotToUse: [
      USE_A_LIBRARY,
      'Anything needing cache garbage collection, retries, refetch on focus/reconnect, pagination or devtools — not implemented here on purpose.',
    ],
    api: {
      signature:
        'function useRequest<T>(key: string | null, fetcher: (key: string) => Promise<T>, options?: { cache?: RequestCache; staleTimeMs?: number }): { data: T | undefined; error: Error | undefined; isLoading: boolean; isValidating: boolean; revalidate: () => Promise<void>; mutate: (next: T | ((current: T | undefined) => T), options?: { revalidate?: boolean }) => Promise<void> }',
      params: [
        {
          name: 'key',
          type: 'string | null',
          description: 'Identifies the data (and its type). `null` skips.',
        },
        { name: 'fetcher', type: '(key) => Promise<T>', description: 'Latest function is used.' },
        {
          name: 'options.cache',
          type: 'RequestCache',
          description:
            'From `createRequestCache()`. Default: a module-level cache. Use a fresh one per test.',
          optional: true,
        },
        {
          name: 'options.staleTimeMs',
          type: 'number',
          description: 'Freshness window. Default `2000`.',
          optional: true,
        },
      ],
      returns: 'Cached data/error, loading flags and stable `revalidate`/`mutate`.',
    },
    execution: [
      'Render: the entry for `key` is read with `useSyncExternalStore` (server snapshot: none).',
      'Effect: if the entry is missing, failed or stale, `revalidate` runs — sharing an in-flight request when one exists.',
      'Settle: the response is discarded if a `mutate` happened after it started (logical clock), otherwise stored and every subscriber re-renders.',
      'Unmount: only the subscription is removed; shared requests keep running and fill the cache.',
    ],
    mistakes: [
      {
        title: 'Same key, different data shapes',
        wrong:
          "useRequest('/api/user', getUser);\nuseRequest('/api/user', getUserName); // returns string",
        why: 'The cache is keyed by string only; the second component receives the first one’s data type.',
      },
    ],
    edgeCases: [
      'Errors keep the previous `data` (stale-while-error).',
      'Entries are never evicted; `cache.clear()` resets everything.',
    ],
    testing:
      'Tests prove one MSW request for three mounted readers, fresh-cache hits without refetching, background revalidation of stale data, mutate-vs-in-flight races and error handling.',
    production: [
      'Use TanStack Query or SWR: they add GC, retries, focus/reconnect refetch, SSR hydration and devtools.',
    ],
    diagram: {
      title: 'Stale-while-revalidate with deduplication',
      description: 'Two components mount with the same key while the cache is stale.',
      mermaid: `sequenceDiagram
  participant A as Component A
  participant B as Component B
  participant C as Cache
  participant S as Server
  A->>C: read key (stale data)
  C-->>A: render stale data now
  A->>C: revalidate
  C->>S: GET key
  B->>C: read + revalidate
  C-->>B: share in-flight promise
  S-->>C: fresh data
  C-->>A: notify, re-render
  C-->>B: notify, re-render`,
    },
  },
  {
    id: 'use-resource',
    title: 'useResource',
    section: 'custom',
    category: CATEGORY,
    level: 'advanced',
    summary: 'Suspense data with React 19 `use()`: one cached promise per key. A teaching tool.',
    tags: ['Suspense', 'use', 'React 19', 'promise cache', 'error boundary'],
    demo: 'examples/custom-hooks/async/UseResourceDemo.tsx',
    sources: ['hooks/async/useResource.ts'],
    tests: ['hooks/async/useResource.test.tsx', 'examples/custom-hooks/async/AsyncDemos.test.tsx'],
    minReact: '19.0',
    support: { level: 'universal' },
    officialDocs: [
      { label: 'use', url: 'https://react.dev/reference/react/use' },
      { label: '<Suspense>', url: 'https://react.dev/reference/react/Suspense' },
      TANSTACK,
    ],
    related: ['use-request', 'use-fetch'],
    concept:
      '`createResourceCache()` maps keys to promises (LRU-bounded). `useResource(cache, key, load)` returns `use(cache.read(key, load))`: the component suspends until the promise resolves and rejections go to the nearest error boundary.',
    problem:
      '`use(fetch(...))` inside a component creates a new promise every render and suspends forever. Suspense needs the *same* promise for the same key across renders — i.e. a cache outside the component.',
    whenToUse: [
      'Understanding and demonstrating Suspense-based data fetching.',
      'Small client-only widgets with immutable data per key.',
    ],
    whenNotToUse: [
      'Production data fetching — frameworks (Next.js, React Router loaders) and libraries (TanStack Query `useSuspenseQuery`, SWR `suspense`) own caching, invalidation, abort and SSR streaming.',
      'Data that changes after mutations — there is no automatic invalidation.',
    ],
    api: {
      signature:
        'function useResource<T>(cache: ResourceCache<T>, key: string, load: (key: string) => Promise<T>): T',
      params: [
        {
          name: 'cache',
          type: 'ResourceCache<T>',
          description:
            'From `createResourceCache({ maxEntries? })`, created at module level or in context.',
        },
        { name: 'key', type: 'string', description: 'Cache key.' },
        { name: 'load', type: '(key) => Promise<T>', description: 'Called only on a cache miss.' },
      ],
      returns: 'The resolved value (the component suspends until then).',
    },
    execution: [
      'Render: `cache.read` returns the cached promise or starts `load` and caches it.',
      '`use()` suspends on a pending promise; React shows the Suspense fallback and retries when it settles.',
      'Rejected promises stay cached and are thrown to the error boundary until `invalidate(key)`.',
    ],
    mistakes: [
      {
        title: 'Creating the promise during render',
        wrong: 'const user = use(fetchJson(`/api/users/${id}`));',
        why: 'Each render creates a new promise, so React never sees it resolve — the component suspends forever.',
        right:
          'const user = useResource(users, String(id), (key) => fetchJson(`/api/users/${key}`));',
      },
    ],
    edgeCases: [
      'Loaders receive no AbortSignal: the promise is shared, so no single unmount may cancel it.',
      'Evicting an entry that a mounted component still suspends on causes a refetch on its next render.',
      'In tests, resolve suspended data inside an awaited `act()`.',
    ],
    testing:
      'Tests check promise identity, LRU eviction, suspending then rendering the value, and errors reaching an error boundary; the demo test retries after a 404 via `invalidate`.',
    production: ['Let the framework or a query library own Suspense caching.'],
  },
  {
    id: 'use-pagination',
    title: 'usePagination',
    section: 'custom',
    category: CATEGORY,
    level: 'beginner',
    summary:
      'Page and page-size state with derived ranges and page buttons — pure, works with any data source.',
    tags: ['pagination', 'pager', 'offset', 'page size', 'derived state'],
    demo: 'examples/custom-hooks/async/UsePaginationDemo.tsx',
    sources: ['hooks/async/usePagination.ts'],
    tests: [
      'hooks/async/usePagination.test.tsx',
      'hooks/async/async.ssr.test.tsx',
      'examples/custom-hooks/async/UsePaginationDemo.test.tsx',
    ],
    minReact: '16.8',
    support: { level: 'universal' },
    officialDocs: [
      {
        label: 'Avoid redundant state',
        url: 'https://react.dev/learn/choosing-the-state-structure#avoid-redundant-state',
      },
    ],
    related: ['use-fetch', 'use-infinite-scroll'],
    concept:
      'Stores only `page` and `pageSize`; derives `totalPages`, `startIndex`/`endIndex`, `hasNext`/`hasPrevious` and `pageItems` (with ellipses) during render. The page is clamped to the valid range while rendering.',
    problem:
      'Pagination code often stores derived values (total pages, offsets) and syncs them with effects, producing off-by-one bugs and requests for pages that no longer exist after filtering.',
    whenToUse: [
      'Server-side pagination (send `page`/`pageSize` or `startIndex` as offset).',
      'Client-side pagination of a local array (`items.slice(startIndex, endIndex)`).',
    ],
    whenNotToUse: [
      'Cursor-based APIs without a total — keep the cursor in state or use `useInfiniteScroll`.',
      'Caching pages, prefetching the next one, keeping previous data — TanStack Query `placeholderData` handles that.',
    ],
    api: {
      signature:
        'function usePagination(options: { total: number; initialPage?: number; initialPageSize?: number; siblingCount?: number }): UsePaginationResult',
      params: [
        { name: 'total', type: 'number', description: 'Total item count (`0` while unknown).' },
        {
          name: 'initialPage / initialPageSize',
          type: 'number',
          description: 'Defaults `1` / `10`.',
          optional: true,
        },
        {
          name: 'siblingCount',
          type: 'number',
          description: 'Pages shown around the current one. Default `1`.',
          optional: true,
        },
      ],
      returns:
        '`page`, `pageSize`, `totalPages`, `startIndex`, `endIndex`, `hasPrevious`, `hasNext`, `pageItems`, and `setPage`, `next`, `previous`, `first`, `last`, `setPageSize`.',
    },
    edgeCases: [
      '`total` shrinking below the current page clamps the page during render — no effect, no extra request.',
      '`setPageSize` keeps the first visible item on screen.',
      '`total: 0` → one empty page.',
    ],
    testing:
      'Pure tests for `getPageItems` and hook tests for navigation, clamping, page-size changes and empty lists.',
    production: [
      'Reset to page 1 in the same event handler that changes filters, not in an effect.',
    ],
  },
  {
    id: 'use-infinite-scroll',
    title: 'useInfiniteScroll',
    section: 'custom',
    category: CATEGORY,
    level: 'intermediate',
    summary:
      'Load more when a sentinel scrolls into view — with guards that make duplicate loads impossible.',
    tags: ['infinite scroll', 'IntersectionObserver', 'load more', 'sentinel', 'callback ref'],
    demo: 'examples/custom-hooks/async/UseInfiniteScrollDemo.tsx',
    sources: ['hooks/async/useInfiniteScroll.ts'],
    tests: [
      'hooks/async/useInfiniteScroll.test.tsx',
      'hooks/async/async.ssr.test.tsx',
      'examples/custom-hooks/async/AsyncDemos.test.tsx',
    ],
    minReact: '18.0',
    support: {
      level: 'browser-limited',
      notes:
        '`isSupported` is `false` without IntersectionObserver and on the server — render a “Load more” button.',
    },
    officialDocs: [
      {
        label: 'MDN: Intersection Observer API',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API',
      },
    ],
    related: ['use-pagination', 'use-fetch', 'use-latest'],
    concept:
      'Observes a sentinel element (via a callback ref) and calls `loadMore` when it intersects. While a load runs, the observer is disconnected; afterwards a fresh observer re-checks the sentinel, so short pages chain-load until the viewport is full.',
    problem:
      'Naive scroll listeners fire constantly, and naive observers call `loadMore` several times before state updates — duplicating pages — or never fire again when the first page does not fill the screen.',
    whenToUse: ['Feeds and long lists where position in the list matters less than continuity.'],
    whenNotToUse: [
      'Content users need to reach the footer of, bookmark or compare across pages — use pagination.',
      'Page caching, refetching and cursor bookkeeping — TanStack Query `useInfiniteQuery` or SWR `useSWRInfinite`.',
    ],
    api: {
      signature:
        'function useInfiniteScroll(options: { loadMore: () => Promise<unknown> | void; hasMore: boolean; isLoading?: boolean; rootMargin?: string; root?: Element | null; enabled?: boolean }): { sentinelRef: (element: Element | null) => void; isLoading: boolean; isSupported: boolean }',
      params: [
        {
          name: 'loadMore',
          type: '() => Promise | void',
          description: 'Return a promise so the hook knows when loading finished.',
        },
        { name: 'hasMore', type: 'boolean', description: '`false` disconnects the observer.' },
        {
          name: 'isLoading',
          type: 'boolean',
          description: 'External loading flag (e.g. a “Load more” button).',
          optional: true,
        },
        {
          name: 'rootMargin / root',
          type: 'string / Element | null',
          description: 'Default `200px` / viewport.',
          optional: true,
        },
      ],
      returns:
        'A stable callback ref for the sentinel, the combined loading flag and `isSupported`.',
    },
    execution: [
      'Commit: the callback ref stores the sentinel element in state.',
      'Effect: when it can load, an observer is created; an intersecting entry triggers `loadMore` once (ref guard).',
      'Loading: the observer disconnects; when the promise settles the effect re-runs and observes again.',
      'Unmount: the observer disconnects; a pending promise no longer updates state.',
    ],
    mistakes: [
      {
        title: 'No in-flight guard',
        wrong: 'new IntersectionObserver(([e]) => { if (e.isIntersecting) loadMore(); });',
        why: 'Several callbacks can arrive before React re-renders with `isLoading`, loading the same page twice.',
      },
    ],
    edgeCases: [
      'A sentinel rendered later (conditional) is picked up by the callback ref.',
      'If `loadMore` returns nothing, pass `isLoading` or duplicate loads are possible.',
    ],
    testing:
      'Tests use the `MockIntersectionObserver` fake to trigger intersections, assert one load per page, re-observation after loading, `hasMore`/`isLoading` gating, disconnect on unmount and the unsupported path.',
    production: [
      'Always provide a visible “Load more” button and announce new items in a polite live region.',
    ],
  },
  {
    id: 'use-retry',
    title: 'useRetry',
    section: 'custom',
    category: CATEGORY,
    level: 'intermediate',
    summary:
      'Retry an async call with exponential backoff, jitter, a retry predicate and full cancellation.',
    tags: ['retry', 'exponential backoff', 'jitter', 'resilience', 'flaky network', 'AbortSignal'],
    demo: 'examples/custom-hooks/async/UseRetryDemo.tsx',
    sources: ['hooks/async/useRetry.ts', 'hooks/async/backoff.ts', 'hooks/async/errors.ts'],
    tests: ['hooks/async/useRetry.test.tsx', 'examples/custom-hooks/async/UseRetryDemo.test.tsx'],
    minReact: '16.8',
    support: { level: 'universal' },
    officialDocs: [
      {
        label: 'AWS: Exponential Backoff and Jitter',
        url: 'https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/',
      },
      ABORT_CONTROLLER,
    ],
    related: ['use-async-fn', 'use-fetch', 'use-web-socket'],
    concept:
      '`run()` calls `fn(signal, attempt)`; on a retryable failure it waits `computeBackoff(attempt)` (exponential, capped, jittered) and tries again, up to `maxAttempts`. One AbortSignal covers attempts and waits.',
    problem:
      'Transient failures (deploys, rate limits, flaky mobile networks) deserve a retry — but immediate, unbounded or synchronised retries make outages worse, and forgotten timers keep firing after unmount.',
    whenToUse: [
      'Idempotent requests that can fail transiently: GETs, PUTs, POSTs with idempotency keys.',
    ],
    whenNotToUse: [
      'Non-idempotent writes without an idempotency key.',
      'Errors that will not change: 400, 401, 403, 404 (excluded by the default predicate).',
      'Server state in production — TanStack Query and SWR have retry with backoff built in.',
    ],
    api: {
      signature:
        "function useRetry<T>(fn: (signal: AbortSignal, attempt: number) => Promise<T>, options?: { maxAttempts?: number; baseDelayMs?: number; maxDelayMs?: number; factor?: number; jitter?: 'full' | 'equal' | 'none'; shouldRetry?: (error: Error, attempt: number) => boolean; onRetry?: (event: RetryEvent) => void }): RetryState<T> & { run: () => Promise<AsyncFnOutcome<T>>; cancel: () => void }",
      params: [
        {
          name: 'maxAttempts',
          type: 'number',
          description: 'Total attempts including the first. Default `3`.',
          optional: true,
        },
        {
          name: 'baseDelayMs / maxDelayMs / factor',
          type: 'number',
          description: 'Defaults `500` / `10000` / `2`.',
          optional: true,
        },
        {
          name: 'jitter',
          type: "'full' | 'equal' | 'none'",
          description: 'Default `full`.',
          optional: true,
        },
        {
          name: 'shouldRetry',
          type: '(error, attempt) => boolean',
          description: 'Default `isTransientError`: network errors, timeouts, 408, 429, 5xx.',
          optional: true,
        },
      ],
      returns:
        'State with `status` (`idle | pending | waiting | success | error`), `attempt`, `nextRetryInMs`, `data`, `error`, plus stable `run` and `cancel`.',
    },
    execution: [
      '`run`: aborts any previous run, then loops: `pending` → call `fn` → success, or decide to retry.',
      'Retry: `onRetry` fires, state becomes `waiting`, and an abortable sleep waits for the backoff delay.',
      '`cancel`, a new `run` or unmount abort the signal, which rejects the sleep and clears its timer.',
    ],
    mistakes: [
      {
        title: 'Fixed-interval retry loops',
        wrong:
          'for (let i = 0; i < 5; i++) {\n  try { return await fetch(url); } catch { await sleep(1000); }\n}',
        why: 'Every client retries in lock-step (thundering herd), 4xx errors are retried pointlessly, and the loop cannot be cancelled.',
      },
    ],
    edgeCases: [
      'Aborts are never retried and resolve `{ status: "aborted" }`.',
      '`computeBackoff` and `sleep` are exported for reuse (e.g. reconnect logic).',
    ],
    testing:
      'Fake-timer tests advance through each backoff delay, check give-up, the predicate, cancel (signal aborted, no timers left) and unmount; a real-timer test runs against the `/api/flaky` MSW endpoint.',
    production: ['Honour `Retry-After` on 429/503 responses when your API sends it.'],
  },
  {
    id: 'use-polling',
    title: 'usePolling',
    section: 'custom',
    category: CATEGORY,
    level: 'intermediate',
    summary: 'Poll on an interval without overlapping requests, pausing while the tab is hidden.',
    tags: [
      'polling',
      'interval',
      'visibilitychange',
      'Page Visibility',
      'dashboard',
      'setTimeout chain',
    ],
    demo: 'examples/custom-hooks/async/UsePollingDemo.tsx',
    sources: ['hooks/async/usePolling.ts'],
    tests: [
      'hooks/async/usePolling.test.tsx',
      'hooks/async/async.ssr.test.tsx',
      'examples/custom-hooks/async/AsyncDemos.test.tsx',
    ],
    minReact: '18.0',
    support: { level: 'client-only', notes: 'Idle on the server.' },
    officialDocs: [
      {
        label: 'MDN: Page Visibility API',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API',
      },
      {
        label: 'useSyncExternalStore',
        url: 'https://react.dev/reference/react/useSyncExternalStore',
      },
    ],
    related: ['use-retry', 'use-web-socket', 'use-sse'],
    concept:
      'A `setTimeout` chain: poll, wait for it to settle, then schedule the next one `intervalMs` later. Document visibility is read with `useSyncExternalStore`; hiding the page tears the loop down, showing it starts with an immediate poll.',
    problem:
      '`setInterval(fetch, 2000)` overlaps requests when the server is slow, keeps hammering the API from background tabs, and leaks if not cleared.',
    whenToUse: [
      'Dashboards and status pages where seconds-old data is acceptable and no push channel exists.',
    ],
    whenNotToUse: [
      'When the server can push — use `useWebSocket` or `useSSE`.',
      'Production server state — TanStack Query `refetchInterval` (+ `refetchIntervalInBackground`) and SWR `refreshInterval` do this with caching.',
    ],
    api: {
      signature:
        'function usePolling<T>(fn: (signal: AbortSignal) => Promise<T>, options: { intervalMs: number; enabled?: boolean; pauseWhenHidden?: boolean }): { data: T | undefined; error: Error | undefined; isFetching: boolean; isPaused: boolean; updatedAt: number | undefined; refresh: () => void }',
      params: [
        { name: 'fn', type: '(signal) => Promise<T>', description: 'Latest function is used.' },
        {
          name: 'intervalMs',
          type: 'number',
          description: 'Gap between the end of one poll and the start of the next.',
        },
        { name: 'enabled', type: 'boolean', description: 'Default `true`.', optional: true },
        {
          name: 'pauseWhenHidden',
          type: 'boolean',
          description: 'Default `true`.',
          optional: true,
        },
      ],
      returns:
        'Latest data (kept on errors), last error, flags, `updatedAt` and a stable `refresh()`.',
    },
    execution: [
      'Effect (active = enabled and visible): schedules the first poll, then each next poll after the previous settles.',
      'Cleanup (hidden, disabled, interval change, `refresh`, unmount): clears the timer and aborts the request in flight.',
    ],
    mistakes: [
      {
        title: 'setInterval with async work',
        wrong:
          'useEffect(() => {\n  const id = setInterval(async () => setStats(await getStats()), 2000);\n  return () => clearInterval(id);\n}, []);',
        why: 'If a request takes longer than 2 s, requests pile up and responses may arrive out of order; it also polls from hidden tabs.',
      },
    ],
    edgeCases: [
      'A failing poll keeps the last good `data` and keeps polling.',
      'Returning to the tab polls immediately, so the data is never older than one interval after focus.',
    ],
    testing:
      'Fake-timer tests prove no overlap with a slow response, interval timing, error handling, pause/resume via `setDocumentVisibility`, `refresh` aborting the request, and cleanup on disable/unmount (`vi.getTimerCount() === 0`).',
    production: ['Back off the interval on repeated errors and stop polling for logged-out users.'],
  },
  {
    id: 'use-web-socket',
    title: 'useWebSocket',
    section: 'custom',
    category: CATEGORY,
    level: 'advanced',
    summary: 'A WebSocket connection with status, bounded message history and backoff reconnects.',
    tags: ['WebSocket', 'realtime', 'reconnect', 'backoff', 'readyState', 'push'],
    demo: 'examples/custom-hooks/async/UseWebSocketDemo.tsx',
    sources: ['hooks/async/useWebSocket.ts', 'hooks/async/backoff.ts'],
    tests: [
      'hooks/async/useWebSocket.test.tsx',
      'hooks/async/async.ssr.test.tsx',
      'examples/custom-hooks/async/UseWebSocketDemo.test.tsx',
    ],
    minReact: '18.0',
    support: { level: 'client-only', notes: '`closed` and `isSupported: false` on the server.' },
    officialDocs: [
      {
        label: 'MDN: WebSocket',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/WebSocket',
      },
      { label: 'MSW: Mocking WebSocket', url: 'https://mswjs.io/docs/websocket' },
    ],
    related: ['use-sse', 'use-retry', 'use-polling'],
    concept:
      'Opens a socket in an effect, tracks `connecting | open | closing | closed`, parses messages into a bounded history, and reconnects after unexpected closes with exponential backoff and jitter. `close()` and unmount never reconnect.',
    problem:
      'Raw sockets in components leak connections on unmount, reconnect in tight loops (or never), grow message arrays forever and send while still connecting.',
    whenToUse: [
      'Bidirectional realtime features: chat, collaborative cursors, live notifications with acknowledgements.',
    ],
    whenNotToUse: [
      'One-way server → client updates — `useSSE` is simpler and works over plain HTTP.',
      'App-wide connections shared by many components — create one client at module level or in context.',
      'Production realtime with rooms, acks and fallbacks — a dedicated client (e.g. Socket.IO, Phoenix, Ably).',
    ],
    api: {
      signature:
        'function useWebSocket<T = unknown>(url: string | null, options?: { protocols?: string | string[]; parse?: (data: unknown) => T; historyLimit?: number; reconnect?: false | { maxAttempts?: number; stableAfterMs?: number; baseDelayMs?: number; maxDelayMs?: number; jitter?: "full" | "equal" | "none" }; onOpen?; onMessage?; onClose?; onError? }): UseWebSocketResult<T>',
      params: [
        { name: 'url', type: 'string | null', description: '`null` disconnects.' },
        {
          name: 'parse',
          type: '(data) => T',
          description:
            'Default: JSON for strings (raw string if invalid). Validate untrusted data.',
          optional: true,
        },
        {
          name: 'historyLimit',
          type: 'number',
          description: 'Messages kept. Default `50`.',
          optional: true,
        },
        {
          name: 'reconnect',
          type: 'false | ReconnectOptions',
          description:
            'Default 5 consecutive attempts; the counter resets after a connection stays up `stableAfterMs` (5 s).',
          optional: true,
        },
      ],
      returns:
        '`status`, `lastMessage`, `messages`, `send` / `sendJson` (return `false` when not open), `close`, `reconnect`, `reconnectAttempt`, `gaveUp`, `clearMessages`, `isSupported`.',
    },
    execution: [
      'Render: before the effect reports anything for the current URL, the status is derived as `connecting`.',
      'Effect: creates the socket and attaches handlers that update state.',
      'Unexpected close: schedules a reconnect with `computeBackoff`; after `maxAttempts` failures sets `gaveUp`.',
      'Cleanup (URL change, `reconnect()`, unmount): handlers are disabled first, timers cleared, socket closed.',
    ],
    mistakes: [
      {
        title: 'Reconnecting immediately in onclose',
        wrong: 'socket.onclose = () => connect();',
        why: 'A down server receives a reconnect storm from every client; the loop also continues after unmount.',
      },
    ],
    edgeCases: [
      '`send` while connecting returns `false` — there is no offline queue.',
      'A server that accepts then immediately drops connections still counts as failing, thanks to `stableAfterMs`.',
    ],
    testing:
      'Tests run against MSW’s WebSocket interception (`ws.link(LIVE_SOCKET_URL)`): messages and replies, history limit, server-initiated close and reconnect, give-up, manual close/reconnect, server-side close on unmount and the unsupported path.',
    production: [
      'Authenticate during the handshake (cookie or short-lived token), and re-subscribe to channels after reconnecting.',
    ],
  },
  {
    id: 'use-sse',
    title: 'useSSE',
    section: 'custom',
    category: CATEGORY,
    level: 'intermediate',
    summary:
      'Subscribe to Server-Sent Events with EventSource: named events, history and clean shutdown.',
    tags: ['SSE', 'EventSource', 'server push', 'streaming', 'realtime'],
    demo: 'examples/custom-hooks/async/UseSSEDemo.tsx',
    sources: ['hooks/async/useSSE.ts'],
    tests: [
      'hooks/async/useSSE.test.tsx',
      'hooks/async/async.ssr.test.tsx',
      'examples/custom-hooks/async/AsyncDemos.test.tsx',
    ],
    minReact: '18.0',
    support: {
      level: 'browser-limited',
      notes:
        'Feature-detects `EventSource` (`isSupported`). The mock `/api/events` exists only in browsers.',
    },
    officialDocs: [
      {
        label: 'MDN: Using server-sent events',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events',
      },
      {
        label: 'MDN: EventSource',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/EventSource',
      },
    ],
    related: ['use-web-socket', 'use-polling'],
    concept:
      'Creates an `EventSource` in an effect, listens to the given event types, parses each message and keeps a bounded history. Status mirrors `readyState`: the browser retries by itself (`connecting`) unless the failure is fatal (`closed`).',
    problem:
      'Forgetting to `close()` keeps streams (and server connections) open after navigation; named events need explicit listeners; fatal vs retrying errors look the same in `onerror`.',
    whenToUse: ['One-way live updates over HTTP: notifications, progress, logs, prices.'],
    whenNotToUse: [
      'The client must send messages — use `useWebSocket`.',
      'You need custom headers (e.g. `Authorization`) — `EventSource` cannot set them; use `fetch` streaming.',
    ],
    api: {
      signature:
        'function useSSE<T = unknown>(url: string | null, options?: { eventTypes?: readonly string[]; withCredentials?: boolean; parse?: (data: string, type: string) => T; historyLimit?: number; onMessage?; onError? }): { isSupported: boolean; status: "connecting" | "open" | "closed"; lastMessage; messages; close: () => void; reconnect: () => void }',
      params: [
        { name: 'url', type: 'string | null', description: '`null` closes the stream.' },
        {
          name: 'eventTypes',
          type: 'readonly string[]',
          description: 'Default `["message"]`; add named `event:` types.',
          optional: true,
        },
        {
          name: 'parse',
          type: '(data, type) => T',
          description: 'Default JSON with raw-string fallback.',
          optional: true,
        },
      ],
      returns:
        'Support flag, status, messages (`{ type, data, lastEventId }`), stable `close` and `reconnect`.',
    },
    execution: [
      'Effect: `new EventSource(url, { withCredentials })` and listeners for `open`, `error` and each event type.',
      'Error: `readyState` CONNECTING → `connecting` (browser retries); CLOSED → `closed` (fatal).',
      'Cleanup: listeners removed and `close()` called — no late updates.',
    ],
    edgeCases: [
      'When the server ends the stream normally, browsers reconnect after the `retry:` delay and send `Last-Event-ID`.',
      'HTTP/1.1 limits browsers to ~6 connections per origin, including SSE streams.',
    ],
    testing:
      'jsdom has no EventSource, so tests install a small fake with `vi.stubGlobal`: open, JSON messages, named events, history limit, retry vs fatal errors, reconnect, close and URL changes.',
    production: ['Serve SSE over HTTP/2 to avoid the per-origin connection limit.'],
  },
];
