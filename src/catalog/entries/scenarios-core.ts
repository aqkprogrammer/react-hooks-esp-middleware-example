import type { CatalogEntry } from '../types';

const ABORT_DOCS = {
  label: 'MDN: AbortController',
  url: 'https://developer.mozilla.org/en-US/docs/Web/API/AbortController',
};
const FETCHING_IN_EFFECTS_DOCS = {
  label: 'react.dev: Fetching data in Effects',
  url: 'https://react.dev/reference/react/useEffect#fetching-data-with-effects',
};
const LIVE_REGION_DOCS = {
  label: 'MDN: ARIA live regions',
  url: 'https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions',
};
const STORAGE_DOCS = {
  label: 'MDN: Web Storage API',
  url: 'https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API',
};
const TANSTACK_DOCS = {
  label: 'TanStack Query',
  url: 'https://tanstack.com/query/latest/docs/framework/react/overview',
};

export const entries: CatalogEntry[] = [
  // ---------------------------------------------------------------------
  {
    id: 'search-with-cancellation',
    title: 'Search with cancellation',
    section: 'scenario',
    category: 'Data & networking',
    level: 'intermediate',
    summary:
      'Search-as-you-type that debounces input, aborts stale requests and can never show an older response.',
    tags: [
      'search',
      'autocomplete',
      'debounce',
      'AbortController',
      'race condition',
      'stale response',
      'aria-live',
    ],
    demo: 'examples/scenarios/search-with-cancellation/SearchWithCancellationScenario.tsx',
    sources: [
      'examples/scenarios/search-with-cancellation/SearchWithCancellationScenario.tsx',
      'examples/scenarios/search-with-cancellation/searchApi.ts',
      'hooks/timing/useDebounce.ts',
      'hooks/async/useAsync.ts',
      'hooks/async/fetchJson.ts',
    ],
    tests: ['examples/scenarios/search-with-cancellation/SearchWithCancellationScenario.test.tsx'],
    minReact: '18.0',
    officialDocs: [ABORT_DOCS, FETCHING_IN_EFFECTS_DOCS, LIVE_REGION_DOCS],
    related: ['use-debounce', 'use-async', 'use-fetch', 'use-effect-race-conditions'],
    concept:
      'The input stays instant; `useDebounce` publishes the trimmed query once typing pauses, and `useAsync` runs one `fetchJson` per published query with an `AbortSignal`. A new query aborts the previous request, and a superseded run can never set state.',
    problem:
      '`/api/search` answers *shorter* queries more slowly, so typing “ja” then “jav” makes the “ja” response arrive last. Without cancellation it overwrites the newer results — the classic stale-response race — and every keystroke costs a request.',
    whenToUse: [
      'Search boxes, autocomplete, filters that query a server.',
      'Any input-driven request where only the latest answer matters.',
    ],
    whenNotToUse: [
      'Filtering data you already have in memory: filter during render (with `useDeferredValue` if it is slow).',
      'Search results shared across screens or worth caching: use TanStack Query with the query in the key.',
    ],
    execution: [
      'Keystroke: `query` state updates and the input re-renders immediately.',
      '`useDebounce` publishes the trimmed value after the selected delay; below 2 characters the request is disabled (`enabled: false`), which also aborts one in flight.',
      'A new debounced value changes the `useAsync` deps: during that render the state is already `pending` (with the previous data kept for a calm UI), and the effect cleanup aborts the previous controller.',
      '`fetchJson` rejects non-2xx answers with `HttpError` and the custom `parse` validates the body shape.',
      'Only the latest run commits `success`/`error`; the polite `role="status"` paragraph announces “N results for …”.',
    ],
    edgeCases: [
      'Debounce at 0 ms: every keystroke requests, and the log shows each stale request being aborted.',
      'Query “error” → HTTP 503 → an alert with a working Retry (`reload()`).',
      'A response with an unexpected shape is an error, not a crash.',
      'Typing back to the already-published query does not refetch.',
      'Unmount aborts the request in flight.',
    ],
    testing:
      'MSW overrides make the earlier query slow (600 ms) and the later one fast; the test types “ja”, waits until that request starts, types “v”, and asserts the “jav” results stay after the stale response would have arrived and that the log recorded the abort. Other tests cover the single debounced request, minimum length, empty state, the 503 + retry and response validation.',
    production: [
      'Cancel on the server too where possible (the abort only frees the client).',
      'Put the query in the URL (`?q=`) so results are shareable — this scenario keeps it local.',
      'Rate-limit or cache popular queries server-side; debounce is not a security control.',
    ],
    diagram: {
      title: 'Debounced fetch with cancellation',
      description:
        'Two queries in flight: the older, slower one is aborted when the newer one starts, so its late answer is never rendered.',
      mermaid: `sequenceDiagram
    actor User
    participant Input
    participant Debounce as useDebounce
    participant Async as useAsync
    participant API as /api/search
    User->>Input: types "ja"
    Input->>Debounce: value "ja"
    Debounce-->>Async: publish "ja" after pause
    Async->>API: GET q=ja (signal A)
    User->>Input: types "v"
    Input->>Debounce: value "jav"
    Debounce-->>Async: publish "jav"
    Async->>Async: cleanup aborts signal A
    Async->>API: GET q=jav (signal B)
    API-->>Async: results for "jav"
    Async-->>Input: render jav results
    API--xAsync: "ja" answer (aborted, ignored)`,
    },
  },

  // ---------------------------------------------------------------------
  {
    id: 'data-table',
    title: 'Server-driven data table',
    section: 'scenario',
    category: 'Data & networking',
    level: 'intermediate',
    summary:
      'Paginated, sortable, filterable product table that keeps the current page visible while the next one loads.',
    tags: ['table', 'pagination', 'sorting', 'filtering', 'aria-sort', 'keepPreviousData'],
    demo: 'examples/scenarios/data-table/DataTableScenario.tsx',
    sources: [
      'examples/scenarios/data-table/DataTableScenario.tsx',
      'examples/scenarios/data-table/productsQuery.ts',
      'hooks/async/usePagination.ts',
      'hooks/async/useFetch.ts',
      'hooks/timing/useDebouncedCallback.ts',
    ],
    tests: ['examples/scenarios/data-table/DataTableScenario.test.tsx'],
    minReact: '18.0',
    officialDocs: [
      {
        label: 'WAI-ARIA APG: Sortable table',
        url: 'https://www.w3.org/WAI/ARIA/apg/patterns/table/examples/sortable-table/',
      },
      {
        label: 'react.dev: Adjusting state when a prop changes',
        url: 'https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes',
      },
    ],
    related: ['use-pagination', 'use-fetch', 'use-debounced-callback', 'tanstack-query'],
    concept:
      'All query state (page, page size, sort, category, text) is local `useState`; the URL for `/api/products` is derived from it during render and `useFetch` with `keepPreviousData` loads it. `usePagination` owns the page maths and clamps the page against the last known total.',
    problem:
      'Server-side tables tend to jump (rows vanish while loading), send duplicate requests when a filter change and a page reset happen separately, and ship header “sort” controls that screen readers cannot operate or understand.',
    whenToUse: [
      'Data sets too large to load at once, where the server sorts and filters.',
      'Admin lists, reports, search result grids.',
    ],
    whenNotToUse: [
      'A few hundred rows you already have: sort and filter in memory with `usePagination` slicing.',
      'Tables whose state must be shareable or survive reloads: keep it in the URL (router search params) instead of local state.',
      'Complex grids (column resizing, virtualization, grouping): use TanStack Table.',
    ],
    execution: [
      'Render: `usePagination({ total })` clamps the page, then the URL is built and passed to `useFetch`.',
      'A sort/category/page-size change and `first()` happen in the same handler → one render, one request.',
      'The text filter updates the visible input immediately; `useDebouncedCallback` applies the trimmed text *and* resets the page in one callback 300 ms later.',
      'While pending, `keepPreviousData` keeps the old rows on screen; the table region gets `aria-busy` and is dimmed.',
      'When a response arrives with a different `total`, it is stored during render (the “adjust state on change” pattern) so the next render paginates against it.',
    ],
    edgeCases: [
      'Filters that shrink the result set: the page is clamped during render, never out of range.',
      'Header clicks cycle ascending → descending → unsorted; `aria-sort` is only set on the sorted column.',
      'Zero results: “No products match your filters.” plus a Clear filters button.',
      'Initial load: placeholder rows reserve the height of one page.',
      'HTTP errors show a Retry while the last rows stay visible.',
    ],
    testing:
      'Tests drive the real mocked API (500 products) and record request URLs via `server.events`: first page, server sort order and `aria-sort` cycling, category change resetting to page 1, the debounced filter producing exactly one request, previous rows staying visible during a delayed page load, page size, empty state and error + retry.',
    production: [
      'Abort is not enough for expensive queries: add server-side limits and indexes for sortable columns.',
      'Mirror the query in the URL for deep links and back/forward navigation.',
      'Use TanStack Query (`placeholderData: keepPreviousData`) to cache visited pages and prefetch the next one.',
    ],
  },

  // ---------------------------------------------------------------------
  {
    id: 'infinite-scroll-feed',
    title: 'Infinite scroll with a “Load more” fallback',
    section: 'scenario',
    category: 'Data & networking',
    level: 'intermediate',
    summary:
      'Product feed that loads pages with an IntersectionObserver sentinel, keeps a real button, and handles end-of-list and errors.',
    tags: ['infinite scroll', 'IntersectionObserver', 'load more', 'pagination', 'accessibility'],
    demo: 'examples/scenarios/infinite-scroll/InfiniteScrollScenario.tsx',
    sources: [
      'examples/scenarios/infinite-scroll/InfiniteScrollScenario.tsx',
      'examples/scenarios/infinite-scroll/feedState.ts',
      'hooks/async/useInfiniteScroll.ts',
      'hooks/async/fetchJson.ts',
      'mocks/extra/scenariosCore.ts',
    ],
    tests: ['examples/scenarios/infinite-scroll/InfiniteScrollScenario.test.tsx'],
    minReact: '18.0',
    support: {
      level: 'browser-limited',
      notes: 'Without IntersectionObserver pages load only through the “Load more” button.',
    },
    officialDocs: [
      {
        label: 'MDN: Intersection Observer API',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API',
      },
      LIVE_REGION_DOCS,
    ],
    related: ['use-infinite-scroll', 'use-intersection-observer', 'use-reducer', 'use-pagination'],
    concept:
      'A reducer holds the feed (items, next page, `hasMore`, status). The first page is requested by an effect; later pages by `loadMore`, called either by `useInfiniteScroll` when the sentinel nears the viewport or by the “Load more” button.',
    problem:
      'Scroll-only feeds load pages twice, retry forever after an error, trap keyboard users above the footer, say nothing to screen-reader users and do nothing in browsers without IntersectionObserver.',
    whenToUse: [
      'Browsing feeds where position in the list matters less than continuity.',
      'Mobile lists where pagination controls are clumsy.',
    ],
    whenNotToUse: [
      'Results users need to reference or compare (“item 3 on page 2”): use pagination.',
      'Very long lists kept in memory: add virtualization (e.g. TanStack Virtual).',
      'Shared, cached server data: TanStack Query `useInfiniteQuery` handles pages, refetching and retries.',
    ],
    execution: [
      'Mount: status starts as `loading`, so the hook creates no observer until page 1 settles (no double load).',
      'The sentinel intersects → the hook calls `loadMore`, disconnects while its promise is pending and re-observes afterwards, which loads another page if the new items did not fill the viewport.',
      '`loadMore` dispatches `start`, fetches with an `AbortController` and dispatches `success` (deduplicating ids) or `failure`.',
      'After an error `hasMore` passed to the hook is `false`, so nothing retries automatically; Retry calls `loadMore` again.',
      'Changing the category remounts the feed with a new `key`: state resets and the unmount aborts the request in flight.',
    ],
    edgeCases: [
      'Two intersection callbacks before a re-render: still one request (the hook guards synchronously).',
      'Last page: “You’ve reached the end of the list.”, the button is replaced by a note.',
      '“Make the next page request fail” sends `?fail=1` once (MSW returns 500).',
      'No IntersectionObserver: a warning explains that the button is the way to load more.',
      'Duplicate or overlapping pages are ignored by the reducer.',
    ],
    testing:
      'With `installIntersectionObserver()` the test triggers the sentinel twice and asserts exactly one request for page 2; without it, the fallback notice and button are tested. Tiny two-page MSW responses reach the end state; the failure switch tests the alert, no auto-retry and Retry; a reducer unit test covers duplicate pages.',
    production: [
      'Restore scroll position when users navigate back (store loaded pages or use a cache).',
      'Move focus sensibly: after “Load more”, focus can stay on the button; never steal focus on automatic loads.',
      'Cap the number of rendered items or virtualize.',
    ],
  },

  // ---------------------------------------------------------------------
  {
    id: 'shopping-cart',
    title: 'Shopping cart (reducer + localStorage)',
    section: 'scenario',
    category: 'State & persistence',
    level: 'intermediate',
    summary:
      'Cart with typed reducer actions, totals derived during render, validated persistence and Intl currency formatting.',
    tags: [
      'cart',
      'reducer',
      'discriminated union',
      'localStorage',
      'derived state',
      'Intl.NumberFormat',
      'money',
    ],
    demo: 'examples/scenarios/shopping-cart/ShoppingCartScenario.tsx',
    sources: [
      'examples/scenarios/shopping-cart/ShoppingCartScenario.tsx',
      'examples/scenarios/shopping-cart/useCart.ts',
      'examples/scenarios/shopping-cart/cart.ts',
      'hooks/storage/useLocalStorage.ts',
      'hooks/storage/storageState.ts',
    ],
    tests: ['examples/scenarios/shopping-cart/ShoppingCartScenario.test.tsx'],
    minReact: '18.0',
    officialDocs: [
      {
        label: 'MDN: Intl.NumberFormat',
        url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat',
      },
      {
        label: 'react.dev: Extracting state logic into a reducer',
        url: 'https://react.dev/learn/extracting-state-logic-into-a-reducer',
      },
      STORAGE_DOCS,
    ],
    related: [
      'use-local-storage',
      'use-reducer',
      'usestate-vs-usereducer',
      'use-state-derived-state',
    ],
    concept:
      '`cartReducer(state, action)` is a pure function over a discriminated union (`add`, `remove`, `setQuantity`, `clear`). `useCart` uses it as the *update function* of `useLocalStorage`: `dispatch(action)` = `setCart(prev => cartReducer(prev, action))`. Totals are computed from the lines on every render.',
    problem:
      'Carts are where duplicated state hurts: totals stored next to lines drift, floats produce $0.30000000000000004, `useReducer` plus a “save in an effect” leaves two copies of the cart, and corrupt or old stored data crashes the page.',
    whenToUse: [
      'Client-owned state with several distinct transitions that should survive reloads.',
      'When the same state must stay in sync across tabs.',
    ],
    whenNotToUse: [
      'Carts that belong to a signed-in user: the server is the source of truth (persist via API, cache with TanStack Query).',
      'If you need middleware (logging, analytics) around dispatch, use `useReducerWithMiddleware` with the persistence middleware from `src/middleware/reducer` instead.',
    ],
    execution: [
      'Render: `useLocalStorage` reads and validates the stored cart (`isCartState`); invalid data falls back to the empty cart and reports `invalid`/`parse`.',
      'An event handler dispatches an action; the reducer runs against the *stored* value, the result is written synchronously and every subscriber (and other tabs) re-render.',
      '`getCartTotals` derives item count, subtotal, shipping, tax and total in integer cents during render — nothing derived is stored.',
      '`Intl.NumberFormat` (memoised per locale) formats cents only at the edge.',
      'Typed quantities are kept as a local draft and committed on Enter/blur, so clearing the field to retype is possible.',
    ],
    edgeCases: [
      'Quantities are clamped to 1–10; typing 0 removes the line; NaN is ignored.',
      'The price is captured when the item is added, like a real checkout snapshot.',
      'Free shipping from $75; the “add $X more” hint is derived too.',
      'Stored data with duplicate lines, fractional cents or bad quantities is rejected.',
      'A write from another tab (storage event) updates this tab.',
    ],
    testing:
      'User-event tests add items and check every derived total (computed by hand), quantity buttons, typed quantities (clamp, commit on Enter/blur, 0 removes), locale formatting (`de-DE`), restoring and cross-tab updates via `StorageEvent`, and invalid stored data. Unit tests cover the reducer, validator and tax rounding.',
    production: [
      'Recalculate prices, tax and shipping on the server at checkout — client totals are only a preview.',
      'Version the stored shape (see the persistent-preferences scenario) before changing it.',
      'Never put payment or personal data in localStorage.',
    ],
  },

  // ---------------------------------------------------------------------
  {
    id: 'optimistic-rollback',
    title: 'Optimistic updates with rollback',
    section: 'scenario',
    category: 'Data & networking',
    level: 'advanced',
    summary:
      'Todo list that applies add/toggle/delete instantly, marks pending items and rolls back failures with a message.',
    tags: ['optimistic UI', 'rollback', 'mutation', 'useOptimistic', 'pending state', 'todos'],
    demo: 'examples/scenarios/optimistic-rollback/OptimisticRollbackScenario.tsx',
    sources: [
      'examples/scenarios/optimistic-rollback/OptimisticRollbackScenario.tsx',
      'examples/scenarios/optimistic-rollback/todoMutations.ts',
      'hooks/advanced/useOptimisticMutation.ts',
      'hooks/async/useFetch.ts',
      'mocks/extra/scenariosCore.ts',
    ],
    tests: ['examples/scenarios/optimistic-rollback/OptimisticRollbackScenario.test.tsx'],
    minReact: '18.0',
    officialDocs: [
      { label: 'react.dev: useOptimistic', url: 'https://react.dev/reference/react/useOptimistic' },
      {
        label: 'TanStack Query: Optimistic updates',
        url: 'https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates',
      },
    ],
    related: ['use-optimistic-mutation', 'use-optimistic', 'use-fetch', 'tanstack-query'],
    concept:
      '`useOptimisticMutation` keeps the server-confirmed list plus a queue of pending mutations; what renders is the confirmed list with every pending mutation replayed by `applyOptimistic`. Success folds the server answer in with `applyResult` (server ids replace temporary ones); failure just drops the pending entry.',
    problem:
      'Waiting for the server on every click feels slow, but naive optimistic code (“snapshot, mutate, restore on error”) breaks when two mutations overlap: restoring a snapshot also undoes the other, successful one.',
    whenToUse: [
      'Mutations that almost always succeed and are cheap to undo: toggles, likes, reordering, adding list items.',
      'Optimistic state owned by a hook, outside a form Action.',
    ],
    whenNotToUse: [
      'Inside `<form action>` / `startTransition`: use React 19 `useOptimistic`, which reverts automatically when the Action ends.',
      'Server-cache data shared by many screens: TanStack Query `onMutate`/`onError`/`invalidateQueries`.',
      'Irreversible or high-stakes actions (payments, sending email): show real progress instead.',
    ],
    execution: [
      '`TodoLoader` fetches `/api/todos` with `useFetch` and mounts the list with the result as `initialState` (no effect copying fetched data into state).',
      '`mutate(variables)` dispatches `start`; the new derived state renders immediately and the item is marked pending (`aria-busy`, “Saving…”, dashed border).',
      'The request runs with an `AbortSignal` (aborted on unmount).',
      'Success → `applyResult` updates the confirmed list; `onSuccess` sets a polite status message.',
      'Failure → the pending entry is removed (the UI snaps back) and `onError` shows an alert naming the change that was undone.',
    ],
    edgeCases: [
      'Title containing “fail” → POST returns 500 → the new item disappears again.',
      'The x-fail checkbox sends `x-fail: 1` on PATCH/DELETE → toggle flips back, deleted item reappears.',
      'Items whose add is still pending cannot be toggled or deleted (they have no server id yet).',
      'Concurrent mutations finishing out of order never clobber each other (no snapshots).',
      '“Reload from server” remounts the list from fresh data; it is disabled while mutations are in flight.',
    ],
    testing:
      'Tests run against the MSW todo API: the pending marker appears immediately and clears on success, rejected adds/toggles/deletes roll back with the exact alert text, a real delete survives a reload, and empty titles are validated without a request. Unit tests cover the pure apply functions.',
    production: [
      'Make mutations idempotent (client-generated ids or idempotency keys) so retries cannot duplicate.',
      'Refetch after a burst of mutations to reconcile with changes from other users.',
      'Keep rollback messages specific and offer Retry for transient failures.',
    ],
    diagram: {
      title: 'Optimistic update and rollback',
      description:
        'Each mutation is pending from the click until the server answers; rendered state is always confirmed state plus pending mutations.',
      mermaid: `stateDiagram-v2
    [*] --> Confirmed
    Confirmed --> Pending: mutate() applies change instantly
    Pending --> Pending: another mutate() queues on top
    Pending --> Confirmed: success, applyResult folds in server data
    Pending --> RolledBack: failure, pending entry dropped
    RolledBack --> Confirmed: UI shows confirmed state and error message
    Confirmed --> [*]`,
    },
  },

  // ---------------------------------------------------------------------
  {
    id: 'theme-switching',
    title: 'Theme switching (light / dark / system)',
    section: 'scenario',
    category: 'Preferences & theming',
    level: 'intermediate',
    summary:
      'Persisted light/dark/system theme for a scoped container that follows the OS live and respects reduced motion.',
    tags: ['dark mode', 'theme', 'prefers-color-scheme', 'prefers-reduced-motion', 'CSS variables'],
    demo: 'examples/scenarios/theme-switching/ThemeSwitchingScenario.tsx',
    sources: [
      'examples/scenarios/theme-switching/ThemeSwitchingScenario.tsx',
      'examples/scenarios/theme-switching/theme.ts',
      'examples/scenarios/theme-switching/ThemeSwitchingScenario.css',
      'hooks/browser/usePreferredColorScheme.ts',
      'hooks/browser/useReducedMotion.ts',
      'hooks/storage/useLocalStorage.ts',
    ],
    tests: ['examples/scenarios/theme-switching/ThemeSwitchingScenario.test.tsx'],
    minReact: '18.0',
    support: {
      level: 'client-only',
      notes:
        'Without `matchMedia` (server, very old browsers) the OS preference is unknown and “System” uses light.',
    },
    officialDocs: [
      {
        label: 'MDN: prefers-color-scheme',
        url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-color-scheme',
      },
      {
        label: 'MDN: color-scheme',
        url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/color-scheme',
      },
      {
        label: 'MDN: prefers-reduced-motion',
        url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion',
      },
    ],
    related: [
      'use-preferred-color-scheme',
      'use-reduced-motion',
      'use-local-storage',
      'use-media-query',
    ],
    concept:
      'The user’s *choice* (`light | dark | system`) is persisted; the *applied* theme is derived during render from the choice and `usePreferredColorScheme()`. The preview element gets `data-preview-theme`, and its CSS re-declares the design tokens for its subtree, so UI-kit components inside switch too.',
    problem:
      'Theme code often stores the resolved theme (so “system” stops following the OS), flashes the wrong theme on load, animates colour changes for users who asked for reduced motion, or hard-codes colours that ignore the theme.',
    whenToUse: [
      'Any app offering a theme toggle, or widgets (charts, code blocks) that need the theme in JavaScript.',
    ],
    whenNotToUse: [
      'If you only need to follow the OS: pure CSS (`prefers-color-scheme`, `light-dark()`) needs no JavaScript.',
      'App-wide themes: apply them to `<html>` from a blocking inline script before React renders to avoid a flash; this scenario deliberately themes only a container.',
    ],
    execution: [
      'Render: `useLocalStorage` reads the validated choice (default `system`).',
      '`usePreferredColorScheme` subscribes to the media queries through `useSyncExternalStore`; changing the OS setting re-renders with the new value.',
      '`resolveTheme(choice, system)` returns `light` or `dark`; unknown preference falls back to light.',
      '`useReducedMotion` sets `data-motion`, which turns the 400 ms cross-fade off.',
      'Picking a radio (or the in-preview switch) writes the choice; other tabs follow via the storage event.',
    ],
    edgeCases: [
      'An invalid stored value (e.g. “sepia”) is ignored and “System” is used.',
      'The playground’s own `<html data-theme>` is never touched (asserted in tests).',
      'The in-preview button switches to an explicit theme, so “system” stops following the OS until chosen again.',
    ],
    testing:
      '`installMatchMedia` drives `prefers-color-scheme` and `prefers-reduced-motion`; tests flip the OS preference live, persist and restore an explicit choice, assert the document root is untouched, toggle reduced motion and cover the no-`matchMedia` and invalid-storage fallbacks.',
    production: [
      'Set `color-scheme` so native controls and scrollbars match.',
      'Sync the choice to the user profile if they sign in on several devices.',
      'Check contrast of both palettes (WCAG 2.2 AA).',
    ],
  },

  // ---------------------------------------------------------------------
  {
    id: 'persistent-preferences',
    title: 'Persistent preferences with schema migration',
    section: 'scenario',
    category: 'State & persistence',
    level: 'advanced',
    summary:
      'Settings form saved with a versioned storage envelope, migrated from v1 to v2 on read, synced across tabs, resettable.',
    tags: ['settings', 'preferences', 'schema version', 'migration', 'localStorage', 'cross-tab'],
    demo: 'examples/scenarios/persistent-preferences/PersistentPreferencesScenario.tsx',
    sources: [
      'examples/scenarios/persistent-preferences/PersistentPreferencesScenario.tsx',
      'examples/scenarios/persistent-preferences/preferences.ts',
      'examples/scenarios/persistent-preferences/preferencesStorage.ts',
      'hooks/storage/usePersistentState.ts',
    ],
    tests: ['examples/scenarios/persistent-preferences/PersistentPreferencesScenario.test.tsx'],
    minReact: '18.0',
    officialDocs: [
      STORAGE_DOCS,
      {
        label: 'MDN: StorageEvent',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/StorageEvent',
      },
    ],
    related: ['use-persistent-state', 'use-local-storage', 'use-cross-tab-state'],
    concept:
      '`usePersistentState` stores `{"__v": 2, "value": …}` through a small custom adapter (localStorage plus a write tap that powers the raw-JSON panel). Older envelopes run through `migratePreferences` once and are written back; `isPreferences` validates the result.',
    problem:
      'Stored preferences outlive releases. When the shape changes, old data is silently misread (or crashes the settings page), data written by a newer release is clobbered after a rollback, and tabs disagree about the current settings.',
    whenToUse: [
      'User settings whose shape will evolve: themes, layout, locale, notification options.',
      'Any persisted state where you need a migration path rather than a reset.',
    ],
    whenNotToUse: [
      'Settings that must follow the user across devices: store them server-side (cache locally if needed).',
      'A single primitive that will never change shape: `useLocalStorage` is simpler.',
      'Large forms with validation rules: pair a form library with this hook for the persistence part only.',
    ],
    execution: [
      'Render: the hook reads the raw string, unwraps the envelope and compares its version with 2.',
      'v1 (or un-enveloped v0) → `migratePreferences` maps `fontSize: "large"` → 20 px, `compact` → density, unknown languages → `en`, and derives the digest.',
      'After commit the migrated value is written back as v2 once; `onError` reports `version`, `migrate`, `invalid` or `write` problems.',
      'Each control writes immediately with a functional update; other tabs receive the `storage` event through the adapter’s `subscribe`.',
      '“Reset to defaults” removes the key, so the defaults apply (and future default changes reach the user).',
    ],
    edgeCases: [
      '“Seed future v3 data”: newer data is left untouched and defaults are shown with a warning.',
      '“Write corrupt data”: non-JSON is treated as version 0, migration rejects it, defaults are shown.',
      'Out-of-range values (font size 99) fail validation.',
      'The email digest select is disabled while email notifications are off.',
    ],
    testing:
      'Tests assert the exact stored envelope after edits, restoring after remount, the v1 → v2 migration and write-back (`waitFor` on localStorage), the v3 and corrupt-data warnings, cross-tab sync with a dispatched `StorageEvent`, and reset. Pure tests cover `migratePreferences` and `isPreferences`.',
    production: [
      'Keep every migration step (v1→v2→v3…) and test each with real stored samples.',
      'Never delete data you cannot read (newer versions) — a rollback should not lose settings.',
      'Avoid storing anything sensitive; any script on the origin can read localStorage.',
    ],
  },

  // ---------------------------------------------------------------------
  {
    id: 'polling-dashboard',
    title: 'Polling dashboard',
    section: 'scenario',
    category: 'Real-time',
    level: 'intermediate',
    summary:
      'KPI cards that poll /api/stats, pause when the tab is hidden or the device is offline, and show trends and last-updated time.',
    tags: ['polling', 'dashboard', 'visibility', 'offline', 'KPI', 'refresh'],
    demo: 'examples/scenarios/polling-dashboard/PollingDashboardScenario.tsx',
    sources: [
      'examples/scenarios/polling-dashboard/PollingDashboardScenario.tsx',
      'examples/scenarios/polling-dashboard/stats.ts',
      'hooks/async/usePolling.ts',
      'hooks/browser/usePageVisibility.ts',
      'hooks/browser/useOnlineStatus.ts',
      'hooks/state/usePrevious.ts',
    ],
    tests: ['examples/scenarios/polling-dashboard/PollingDashboardScenario.test.tsx'],
    minReact: '18.0',
    officialDocs: [
      {
        label: 'MDN: Page Visibility API',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API',
      },
      {
        label: 'MDN: navigator.onLine',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine',
      },
    ],
    related: ['use-polling', 'use-page-visibility', 'use-online-status', 'use-previous', 'use-sse'],
    concept:
      '`usePolling` runs a `setTimeout` chain (next request only after the previous one settles). Its `enabled` flag combines `usePageVisibility()`, `useOnlineStatus()` and a manual pause, so the UI can say *why* it is paused. `usePrevious(data)` gives the last tick for trend arrows.',
    problem:
      'Dashboards left open in background tabs hammer the API, `setInterval` overlaps slow requests, offline devices log a stream of failures, and a failed poll blanks the screen instead of keeping the last good numbers.',
    whenToUse: [
      'Moderately fresh data (seconds to minutes) where a push channel is not available.',
      'Status pages, admin dashboards, job progress.',
    ],
    whenNotToUse: [
      'Sub-second updates or many clients: push with SSE or WebSockets.',
      'Shared server data: TanStack Query `refetchInterval` (with `refetchIntervalInBackground: false`) adds caching and deduplication.',
    ],
    execution: [
      'Render: visibility and online status come from `useSyncExternalStore`; the pause reason is derived (offline > hidden > manual).',
      'Enabled → the polling effect schedules an immediate poll; each poll aborts on cleanup and times out after 5 s.',
      'Success stores `data` and `updatedAt`; failure keeps the data and sets `error`.',
      'Becoming disabled (hidden/offline/paused) clears the timer and aborts the request; re-enabling polls immediately.',
      'Changing the interval or clicking Refresh restarts the chain with an immediate request.',
    ],
    edgeCases: [
      'Offline: Refresh is disabled and a note says polling resumes automatically.',
      '`navigator.onLine === true` does not prove the API is reachable — failed polls still surface as errors.',
      'Trends compare against the previous *distinct* response, worded as “up/down N” (not colour alone).',
      'Error rate rising is styled as bad news, active users rising as good news.',
    ],
    testing:
      'Request counts come from `server.events`. Tests cover the deterministic tick values and trend text after Refresh, the interval with `vi.useFakeTimers({ shouldAdvanceTime: true })` + `advanceTimersByTimeAsync`, pausing via `setDocumentVisibility`/`setOnline` (restored in reverse order), manual pause/resume, and a 503 that keeps the last good data.',
    production: [
      'Add jitter or server-provided intervals (`Retry-After`) when many clients poll.',
      'Back off after consecutive failures instead of polling at full speed.',
      'Prefer ETags/`304 Not Modified` to make unchanged polls cheap.',
    ],
  },

  // ---------------------------------------------------------------------
  {
    id: 'live-notifications',
    title: 'Live notifications over WebSocket',
    section: 'scenario',
    category: 'Real-time',
    level: 'advanced',
    summary:
      'Notification centre on a WebSocket with connection status, automatic reconnect, unread count and screen-reader announcements.',
    tags: ['WebSocket', 'notifications', 'reconnect', 'backoff', 'unread', 'aria-live'],
    demo: 'examples/scenarios/live-notifications/LiveNotificationsScenario.tsx',
    sources: [
      'examples/scenarios/live-notifications/LiveNotificationsScenario.tsx',
      'examples/scenarios/live-notifications/messages.ts',
      'hooks/async/useWebSocket.ts',
      'hooks/async/backoff.ts',
      'hooks/accessibility/useAnnouncer.ts',
    ],
    tests: ['examples/scenarios/live-notifications/LiveNotificationsScenario.test.tsx'],
    minReact: '18.0',
    support: {
      level: 'browser-limited',
      notes: 'Shows a notice and stays disconnected where `WebSocket` is unavailable.',
    },
    officialDocs: [
      {
        label: 'MDN: WebSocket',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/WebSocket',
      },
      LIVE_REGION_DOCS,
    ],
    related: ['use-web-socket', 'use-announcer', 'use-effect-websocket', 'use-sse'],
    concept:
      '`useWebSocket` owns the connection (status, reconnect with exponential backoff, `close`/`reconnect`). Frames are parsed and validated by `parseServerMessage`; `onMessage` adds notifications to local state (deduplicated, capped at 50) and `useAnnouncer` reads each one out politely.',
    problem:
      'Hand-written socket effects leak connections, reconnect in tight loops (or never), trust whatever JSON arrives, store unbounded history and give screen-reader users no idea that something new arrived.',
    whenToUse: ['Server-pushed events: notifications, chat, presence, live status.'],
    whenNotToUse: [
      'One-way server → client streams: Server-Sent Events are simpler and reconnect natively (`useSSE`).',
      'Several components needing the same socket: share one client through context or a module, not one hook per component.',
    ],
    execution: [
      'Mount: the hook opens the socket; status `connecting` → `open`, `onOpen` announces “connected”.',
      '“Send test notification” sends `{type:"notify", text}`; the mock server pushes back `{type:"notification", id, text, at}`.',
      '`onMessage` (always the latest closure) ignores anything that is not a valid notification, prepends it unread and announces it.',
      'An unexpected close → status `connecting` with `reconnectAttempt`, backoff 250–500 ms, 500–1000 ms, … up to 5 attempts, then “gave up” with a Reconnect button.',
      'Disconnect calls `close()` (no auto-reconnect); unmount closes the socket and cancels timers.',
    ],
    edgeCases: [
      'Malformed JSON, wrong field types and unknown message types are ignored.',
      'Redelivered notifications (same id) are not duplicated.',
      '`send` while not open returns `false`; the button is disabled and an error explains it.',
      'User-initiated disconnects do not announce “connection lost”.',
    ],
    testing:
      'Tests use the MSW `ws` mock at `LIVE_SOCKET_URL`: send/receive, unread counting, mark one/all read and clear, manual disconnect/reconnect, a server-side close 5 ms after connecting (per CONVENTIONS, never synchronously) followed by an automatic reconnect, malformed and duplicate frames, and a stubbed-out `WebSocket`. The announcer region is asserted via its `data-live-announcer` attribute.',
    production: [
      'Authenticate the socket (short-lived token) and re-authenticate on reconnect.',
      'After reconnecting, fetch what was missed (e.g. `?since=lastId`) — sockets do not replay.',
      'Persist read state on the server so it follows the user across devices.',
    ],
  },

  // ---------------------------------------------------------------------
  {
    id: 'race-safe-fetching',
    title: 'Race-safe data fetching',
    section: 'scenario',
    category: 'Data & networking',
    level: 'intermediate',
    summary:
      'Side-by-side profile switcher: a naive fetch-in-effect that shows stale data vs. a reusable hook built on useFetch.',
    tags: [
      'race condition',
      'stale response',
      'AbortController',
      'useEffect',
      'data fetching',
      'custom hook',
    ],
    demo: 'examples/scenarios/race-safe-fetching/RaceSafeFetchingScenario.tsx',
    sources: [
      'examples/scenarios/race-safe-fetching/RaceSafeFetchingScenario.tsx',
      'examples/scenarios/race-safe-fetching/useUserProfile.ts',
      'examples/scenarios/race-safe-fetching/useUserProfileNaive.ts',
      'examples/scenarios/race-safe-fetching/users.ts',
      'hooks/async/useFetch.ts',
      'hooks/async/useAsync.ts',
    ],
    tests: ['examples/scenarios/race-safe-fetching/RaceSafeFetchingScenario.test.tsx'],
    minReact: '18.0',
    officialDocs: [FETCHING_IN_EFFECTS_DOCS, ABORT_DOCS, TANSTACK_DOCS],
    related: ['use-fetch', 'use-async', 'use-effect-race-conditions', 'tanstack-query', 'swr'],
    concept:
      'Both columns receive the same selected id and request `/api/users/:id?delay=…` with a fixed latency per profile. The naive hook fetches in an effect and stores whatever arrives; `useUserProfile` wraps `useFetch`, which aborts superseded requests and only accepts the latest run.',
    problem:
      'Effects run per change, but responses finish in latency order. Click a slow profile and then a fast one, and the naive version ends on the *slow* (older) profile — with no error anywhere. It also stores a 404 body as a user.',
    whenToUse: [
      'Wrapping one endpoint in a typed, validated, reusable hook for a screen or two.',
      'Teaching or auditing fetch-in-effect code.',
    ],
    whenNotToUse: [
      'Data shared across screens or needing caching, deduplication, background refetch, retries or mutation invalidation: use TanStack Query or SWR.',
      'Route-level data in a framework (Next.js, Remix/React Router): use its loaders or Server Components.',
    ],
    mistakes: [
      {
        title: 'Fetching in an effect without cleanup',
        wrong:
          'useEffect(() => {\n  fetch(`/api/users/${id}`)\n    .then((r) => r.json())\n    .then(setUser);\n}, [id]);',
        why: 'Every id change starts a request that is never cancelled; the last one to *finish* wins, which can belong to an older id. A non-2xx body is stored as data.',
        right:
          'useEffect(() => {\n  const controller = new AbortController();\n  fetchJson<User>(`/api/users/${id}`, { signal: controller.signal })\n    .then(setUser, (error) => {\n      if (!controller.signal.aborted) setError(error);\n    });\n  return () => controller.abort();\n}, [id]);\n// or simply: const user = useFetch<User>(`/api/users/${id}`);',
      },
    ],
    execution: [
      'Click: `userId` changes; both columns re-render.',
      'Naive: the effect starts a new `fetch`; the previous one keeps running and calls `setUser` whenever it finishes.',
      'Safe: `useAsync` marks the state `pending` during render, the effect cleanup aborts the previous request, and a new run starts.',
      'Safe: `parseUser` validates the body; non-2xx responses become `HttpError` (404 → error + Retry).',
      'Unmount: the safe hook aborts its request; the naive one leaves it running.',
    ],
    edgeCases: [
      '“Replay the race” selects a slow profile then a fast one 100 ms later, reproducing the bug on demand.',
      'The “Out of sync” badge compares the displayed id with the selected id, so the bug is visible.',
      'Strict Mode runs effects twice in development: the safe hook aborts the first request; the naive one sends two.',
    ],
    testing:
      'An MSW override keeps the latency order but scales it down; the test clicks Ada (slow) then Katherine (fast) and asserts that after Ada’s response arrives the naive column shows Ada (out of sync) while the safe column still shows Katherine. Hook tests assert that unmount aborts the request (`request.signal.aborted`), that invalid bodies are rejected and that `null` is idle.',
    production: [
      'Prefer a data library for server state; keep hand-rolled hooks small and validated.',
      'Always pass the signal through every layer (`fetchJson`, SDK clients) so aborts actually stop work.',
    ],
  },
];
