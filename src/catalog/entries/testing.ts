import type { CatalogEntry } from '../types';

const RTL = {
  label: 'React Testing Library',
  url: 'https://testing-library.com/docs/react-testing-library/intro/',
};
const VITEST = { label: 'Vitest', url: 'https://vitest.dev/guide/' };

export const entries: CatalogEntry[] = [
  {
    id: 'testing-custom-hooks',
    title: 'Testing custom hooks with renderHook',
    section: 'testing',
    category: 'Unit testing',
    level: 'beginner',
    summary:
      'Render a hook in a throwaway component, drive it with `act`, and assert on `result.current`.',
    tags: ['testing', 'renderHook', 'act', 'vitest', 'testing library'],
    sources: ['hooks/storage/useLocalStorage.test.tsx', 'hooks/browser/useEventListener.test.tsx'],
    tests: ['hooks/storage/useLocalStorage.test.tsx'],
    minReact: '18.0',
    officialDocs: [
      RTL,
      {
        label: 'renderHook API',
        url: 'https://testing-library.com/docs/react-testing-library/api/#renderhook',
      },
      VITEST,
    ],
    related: ['testing-fake-timers', 'testing-network-msw', 'testing-browser-apis'],
    concept:
      '`renderHook` from `@testing-library/react` mounts a hook inside a minimal component. `result.current` always holds the latest return value; `rerender(props)` changes its arguments and `unmount()` runs cleanups.',
    problem:
      'Hooks can only run inside components. Testing them through a full demo couples the test to UI details; `renderHook` isolates the contract.',
    whenToUse: [
      'Library hooks with a clear input → output contract (state helpers, timers, subscriptions).',
    ],
    whenNotToUse: [
      'Behaviour that only matters through the UI — render the component and query by role/label instead.',
      '`@testing-library/react-hooks` — it is deprecated; `renderHook` ships with `@testing-library/react` since v13.1.',
    ],
    execution: [
      'Arrange: `renderHook(() => useThing(args), { initialProps, wrapper })`.',
      'Act: call returned functions inside `act(() => ...)` so React flushes updates and effects.',
      'Assert: read `result.current` after `act` — never keep a stale reference to an old return value.',
      'Cleanup: `unmount()` and assert listeners/timers/subscriptions were released.',
    ],
    mistakes: [
      {
        title: 'Destructuring result.current once',
        wrong:
          'const { result } = renderHook(() => useCounter());\nconst { count, increment } = result.current;\nact(() => increment());\nexpect(count).toBe(1); // still 0',
        why: '`count` was captured from the first render. Read `result.current` again after `act`.',
        right: 'act(() => result.current.increment());\nexpect(result.current.count).toBe(1);',
      },
    ],
    testing:
      'This repository has a colocated `*.test.ts(x)` file next to every hook; run `npm test`.',
  },
  {
    id: 'testing-fake-timers',
    title: 'Fake timers for debounce, intervals and retries',
    section: 'testing',
    category: 'Unit testing',
    level: 'intermediate',
    summary:
      'Control time deterministically with `vi.useFakeTimers()` and `vi.advanceTimersByTime()`.',
    tags: ['testing', 'fake timers', 'debounce', 'throttle', 'interval', 'vitest'],
    sources: ['test/setup.ts'],
    tests: ['test/setup.ts'],
    minReact: '16.8',
    officialDocs: [
      { label: 'Vitest: fake timers', url: 'https://vitest.dev/guide/mocking/timers' },
      VITEST,
    ],
    related: ['testing-custom-hooks'],
    concept:
      'Fake timers replace `setTimeout`, `setInterval`, `Date` and friends with a clock the test advances explicitly, wrapped in `act` so React processes the resulting updates.',
    problem:
      'Real timers make tests slow and flaky; timing hooks need precise assertions about *when* something happens.',
    execution: [
      '`vi.useFakeTimers()` before rendering.',
      '`act(() => vi.advanceTimersByTime(ms))` to move time forward.',
      'With user-event, pass `advanceTimers: vi.advanceTimersByTime` to `userEvent.setup()`.',
      '`vi.useRealTimers()` in `afterEach` (or rely on per-test setup).',
    ],
    mistakes: [
      {
        title: 'Advancing timers outside act',
        wrong: 'vi.advanceTimersByTime(500);\nexpect(result.current).toBe("debounced");',
        why: 'State updates scheduled by the timer are not flushed, and React warns about updates outside `act`.',
        right: 'act(() => vi.advanceTimersByTime(500));\nexpect(result.current).toBe("debounced");',
      },
    ],
    edgeCases: [
      'MSW `delay()` uses timers too: either keep real timers for network tests or advance the clock past the delay.',
      'Promises resolve on the microtask queue: use `await act(async () => vi.advanceTimersByTimeAsync(ms))` when timers and promises interleave.',
    ],
  },
  {
    id: 'testing-network-msw',
    title: 'Network tests with Mock Service Worker',
    section: 'testing',
    category: 'Integration testing',
    level: 'intermediate',
    summary:
      'One set of request handlers serves the playground in the browser and every test in Node.',
    tags: ['testing', 'msw', 'fetch', 'mocking', 'race condition', 'websocket'],
    sources: ['mocks/handlers.ts', 'test/server.ts', 'mocks/browser.ts', 'test/setup.ts'],
    tests: ['esp-demo/EspDemo.test.tsx'],
    minReact: '16.8',
    officialDocs: [{ label: 'Mock Service Worker', url: 'https://mswjs.io/docs/' }],
    related: ['testing-custom-hooks'],
    concept:
      'MSW intercepts `fetch`, XHR and `WebSocket` at the network layer. Tests use `setupServer` (Node); the playground uses `setupWorker` (a Service Worker), so demos and tests exercise the same contract.',
    problem:
      'Mocking `fetch` per test couples tests to implementation details and misses bugs in URL building, headers and response handling.',
    execution: [
      '`server.listen({ onUnhandledRequest: "error" })` once — unknown requests fail loudly.',
      'Override per test: `server.use(http.get("/api/search", () => HttpResponse.json(...)))`.',
      '`server.resetHandlers()` and `resetMockDb()` after each test keep tests independent.',
      'Force races deterministically with `delay(ms)` in overrides.',
    ],
    edgeCases: [
      "Node's `fetch` rejects relative URLs; the test setup resolves `/api/...` against jsdom's location so app code stays unchanged.",
      'MSW only creates SSE handlers where `EventSource` exists (browsers), so SSE tests stub `EventSource`.',
    ],
    production: [
      'MSW runs only in the playground and tests — never ship the worker to production deployments of a real app.',
    ],
  },
  {
    id: 'testing-browser-apis',
    title: 'Testing browser APIs jsdom does not implement',
    section: 'testing',
    category: 'Unit testing',
    level: 'intermediate',
    summary:
      'Install fakes for `matchMedia`, `IntersectionObserver` and `ResizeObserver` per test — and test the unsupported path too.',
    tags: [
      'testing',
      'jsdom',
      'matchMedia',
      'IntersectionObserver',
      'ResizeObserver',
      'feature detection',
    ],
    sources: ['test/browserMocks.ts'],
    tests: ['hooks/browser/useMediaQuery.test.tsx'],
    minReact: '16.8',
    officialDocs: [
      { label: 'Vitest: vi.stubGlobal', url: 'https://vitest.dev/api/vi.html#vi-stubglobal' },
    ],
    related: ['testing-custom-hooks', 'testing-ssr'],
    concept:
      'The fakes are installed with `vi.stubGlobal` (restored automatically) and expose controls such as `setMatches(query, true)` or `MockIntersectionObserver.triggerAll(element, true)`.',
    problem:
      'Installing polyfills globally hides bugs in feature detection. Hooks must behave when an API is missing, so tests need both paths.',
    edgeCases: [
      'Read-only properties such as `navigator.onLine` or `document.visibilityState` are overridden with `overrideProperty`, which returns a restore function.',
    ],
  },
  {
    id: 'testing-ssr',
    title: 'Server-rendering tests',
    section: 'testing',
    category: 'Integration testing',
    level: 'advanced',
    summary:
      'Prove hooks can render on the server by running `renderToString` in a Node environment without a DOM.',
    tags: ['testing', 'ssr', 'hydration', 'renderToString', 'node'],
    sources: ['hooks/storage/storage.ssr.test.tsx'],
    tests: ['hooks/storage/storage.ssr.test.tsx'],
    minReact: '18.0',
    officialDocs: [
      {
        label: 'renderToString',
        url: 'https://react.dev/reference/react-dom/server/renderToString',
      },
      {
        label: 'useSyncExternalStore: server rendering',
        url: 'https://react.dev/reference/react/useSyncExternalStore#adding-support-for-server-rendering',
      },
    ],
    related: ['testing-browser-apis'],
    concept:
      'Files named `*.ssr.test.tsx` run in a separate Vitest project with `environment: "node"`, where `window` and `document` are undefined — exactly like a server.',
    problem:
      'A hook that touches `window` during render crashes on the server, and a hook that renders different output on the client causes hydration mismatches.',
    execution: [
      'Render a component that uses the hooks with `renderToString`.',
      'Assert the HTML equals the server snapshot (initial/default values).',
    ],
    edgeCases: [
      'esp-js 8 cannot be imported in Node without a `globalThis.self` shim, so the esp-js integration is client-only.',
    ],
  },
  {
    id: 'testing-strict-mode-and-a11y',
    title: 'Strict Mode, accessibility and end-to-end checks',
    section: 'testing',
    category: 'Integration testing',
    level: 'advanced',
    summary:
      'Render under `<StrictMode>` to catch missing cleanups; query by role; run axe in Playwright against the production build.',
    tags: ['testing', 'strict mode', 'accessibility', 'axe', 'playwright', 'e2e'],
    sources: ['esp-demo/EspDemo.test.tsx', 'middleware/esp-js/esp.test.tsx', 'app/App.test.tsx'],
    tests: ['esp-demo/EspDemo.test.tsx', 'app/App.test.tsx'],
    minReact: '18.0',
    officialDocs: [
      { label: 'StrictMode', url: 'https://react.dev/reference/react/StrictMode' },
      { label: 'Playwright', url: 'https://playwright.dev/docs/intro' },
      { label: 'axe-core', url: 'https://github.com/dequelabs/axe-core' },
    ],
    related: ['testing-custom-hooks', 'testing-network-msw'],
    concept:
      'Strict Mode mounts, unmounts and remounts components in development, so a missing cleanup shows up as duplicated listeners or registrations. Queries by role and label double as accessibility checks. The Playwright suite (`e2e/`) runs axe on real pages in Chromium.',
    problem:
      'Effects that work once can break on remount, and UI that passes unit tests can still be unusable with a keyboard or screen reader.',
    execution: [
      'Wrap renders in `<StrictMode>` (the esp-js tests do) and assert observable behaviour, not render counts.',
      'Prefer `getByRole(name)` / `getByLabelText` queries; they fail when elements lack accessible names.',
      '`npm run test:e2e` builds the app, serves it and runs Playwright + `@axe-core/playwright` (serious/critical violations fail).',
    ],
    edgeCases: [
      'axe in jsdom cannot evaluate colour contrast; the Playwright run in a real browser can.',
    ],
  },
];
