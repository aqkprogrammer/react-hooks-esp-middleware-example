import type { CatalogEntry, DocLink } from '../types';

const USE_EFFECT_DOCS: DocLink = {
  label: 'useEffect',
  url: 'https://react.dev/reference/react/useEffect',
};
const SYNC_DOCS: DocLink = {
  label: 'Synchronizing with effects',
  url: 'https://react.dev/learn/synchronizing-with-effects',
};
const LIFECYCLE_DOCS: DocLink = {
  label: 'Lifecycle of reactive effects',
  url: 'https://react.dev/learn/lifecycle-of-reactive-effects',
};

const DIR = 'examples/built-in/effects';

export const entries: CatalogEntry[] = [
  {
    id: 'use-effect-fundamentals',
    title: 'useEffect — lifecycle & dependency arrays',
    section: 'built-in',
    category: 'Effects',
    level: 'beginner',
    summary:
      'Watch mount, update and unmount in a log: no deps vs `[]` vs `[roomId]`, and which cleanup runs when.',
    tags: ['useEffect', 'lifecycle', 'cleanup', 'dependencies', 'mount', 'unmount'],
    demo: `${DIR}/UseEffectLifecycleDemo.tsx`,
    sources: [`${DIR}/UseEffectLifecycleDemo.tsx`],
    tests: [`${DIR}/UseEffectLifecycleDemo.test.tsx`],
    minReact: '16.8',
    support: { level: 'universal', notes: 'Effects never run during server rendering.' },
    officialDocs: [USE_EFFECT_DOCS, SYNC_DOCS, LIFECYCLE_DOCS],
    related: [
      'use-effect-subscriptions',
      'use-effect-strict-mode',
      'use-effect-race-conditions',
      'use-layout-effect',
      'you-might-not-need-an-effect',
    ],
    concept:
      'An effect synchronises a component with something outside React. React runs it after the commit; before running it again (dependencies changed) or on unmount, it runs the cleanup the previous run returned.',
    problem:
      'Rendering must be pure, yet components need to connect, subscribe, start timers or touch browser APIs. Effects give that code a place with a defined lifecycle and an undo step.',
    whenToUse: [
      'Connecting to external systems: sockets, subscriptions, timers, non-React widgets, browser APIs.',
      'Fetching data when you are not using a framework or data library (with cancellation).',
    ],
    whenNotToUse: [
      'Transforming data for rendering — compute it during render.',
      'Responding to a user event — put the code in the event handler.',
      'Resetting state when a prop changes — use a `key`.',
    ],
    api: {
      signature:
        'function useEffect(setup: () => void | (() => void), deps?: DependencyList): void',
      params: [
        {
          name: 'setup',
          type: '() => void | Destructor',
          description: 'Runs after commit; may return a cleanup function.',
        },
        {
          name: 'deps',
          type: 'unknown[]',
          description:
            'Omitted: after every commit. `[]`: after mount only. `[a, b]`: when any value changed (`Object.is`).',
          optional: true,
        },
      ],
    },
    execution: [
      'Render: React calls the component and records each effect with its dependencies.',
      'Commit: React updates the DOM; layout effects run; the browser can paint.',
      'Passive effects run (usually after paint): first every pending cleanup, then every pending setup, in declaration order.',
      'Re-render with changed deps: the old cleanup runs with the *old* values, then the new setup.',
      'Unmount: every remaining cleanup runs.',
    ],
    mistakes: [
      {
        title: 'Lying about dependencies',
        wrong: 'useEffect(() => {\n  connect(roomId);\n}, []); // roomId missing',
        why: 'The effect keeps the first `roomId` forever. `react-hooks/exhaustive-deps` flags this.',
        right:
          'useEffect(() => {\n  const c = connect(roomId);\n  return () => c.disconnect();\n}, [roomId]);',
      },
      {
        title: 'Missing cleanup',
        wrong: "useEffect(() => {\n  window.addEventListener('resize', onResize);\n}, []);",
        why: 'The listener survives unmount and Strict Mode attaches it twice.',
        right:
          "useEffect(() => {\n  window.addEventListener('resize', onResize);\n  return () => window.removeEventListener('resize', onResize);\n}, [onResize]);",
      },
      {
        title: 'An async effect function',
        wrong: 'useEffect(async () => {\n  setData(await load());\n}, []);',
        why: 'An async function returns a promise, not a cleanup; React warns and cannot cancel it.',
        right:
          'useEffect(() => {\n  let ignore = false;\n  load().then((data) => { if (!ignore) setData(data); });\n  return () => { ignore = true; };\n}, []);',
      },
    ],
    edgeCases: [
      'Objects/functions created during render are new every time: as dependencies they re-run the effect every render. Create them inside the effect or memoise them.',
      'Effects triggered by a discrete event (click) may be flushed before paint; do not rely on "after paint" for correctness.',
    ],
    testing:
      'The demo test reads the log in chronological order and asserts mount order, that an unrelated re-render only re-runs the no-deps effect, that a dependency change runs the old cleanup before the new setup, and that unmount runs every cleanup.',
    production: [
      'Every setup needs a symmetrical cleanup; Strict Mode in development verifies it.',
      'Prefer a data library (TanStack Query, SWR) or framework loaders for fetching.',
    ],
    diagram: {
      title: 'Effect lifecycle',
      description:
        'Render and commit happen first; effects run after commit. A dependency change runs the previous cleanup before the next setup; unmount runs the last cleanup.',
      mermaid: `flowchart TD
  R[Render: call component] --> C[Commit: update the DOM]
  C --> P[Browser paints]
  P --> E[Run effect setup]
  E --> W{Next event}
  W -- re-render, deps unchanged --> R2[Render + commit, effect skipped]
  R2 --> W
  W -- re-render, deps changed --> CL[Run previous cleanup with old values]
  CL --> E
  W -- unmount --> U[Run cleanup]
  U --> D[Done]`,
    },
  },
  {
    id: 'use-effect-subscriptions',
    title: 'useEffect — event listeners, timers & browser APIs',
    section: 'built-in',
    category: 'Effects',
    level: 'beginner',
    summary:
      'A window listener, a setInterval stopwatch and `document.title` sync — each with a cleanup that undoes it.',
    tags: [
      'addEventListener',
      'setInterval',
      'timers',
      'document.title',
      'subscriptions',
      'cleanup',
    ],
    demo: `${DIR}/UseEffectSubscriptionsDemo.tsx`,
    sources: [`${DIR}/UseEffectSubscriptionsDemo.tsx`],
    tests: [`${DIR}/UseEffectSubscriptionsDemo.test.tsx`],
    minReact: '16.8',
    support: { level: 'client-only', notes: 'Effects only run in the browser.' },
    officialDocs: [
      USE_EFFECT_DOCS,
      SYNC_DOCS,
      {
        label: 'MDN: setInterval',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Window/setInterval',
      },
    ],
    related: [
      'use-effect-fundamentals',
      'use-effect-stale-closures',
      'use-event-listener',
      'use-effect-websocket',
    ],
    concept:
      'Each effect subscribes to one external thing and returns the matching unsubscribe: `addEventListener`/`removeEventListener`, `setInterval`/`clearInterval`, set a global/restore it.',
    problem:
      'Without cleanup, listeners and intervals outlive the component, multiply on remount and call `setState` on components that are gone.',
    whenToUse: [
      'Global events React has no prop for (`resize`, window `keydown`, `visibilitychange`).',
      'Timers whose lifetime follows a piece of state (`running`).',
      'Imperative browser APIs that mirror state (`document.title`, `navigator.mediaSession`).',
    ],
    whenNotToUse: [
      'Events on elements you render — use JSX handlers like `onPointerMove`.',
      'Reading values that change over time for rendering — use `useSyncExternalStore` (see the external store pages).',
      'The same listener in many places — extract a hook such as `useEventListener`.',
    ],
    api: {
      signature:
        'useEffect(() => {\n  const id = setInterval(tick, 100);\n  return () => clearInterval(id);\n}, [running]);',
    },
    execution: [
      'Setup runs after commit when its dependency (`running`, `title`, `enabled`) changes.',
      'Cleanup captures the exact id/handler/previous title it must undo.',
      'Updater functions (`setMs((ms) => ms + 100)`) keep the interval callback free of stale state.',
    ],
    mistakes: [
      {
        title: 'Removing a different function than you added',
        wrong:
          "useEffect(() => {\n  window.addEventListener('pointermove', (e) => setPos(e));\n  return () => window.removeEventListener('pointermove', (e) => setPos(e));\n}, []);",
        why: 'Two different arrow functions: the original listener is never removed.',
        right:
          "useEffect(() => {\n  const onMove = (e: PointerEvent) => setPos(e);\n  window.addEventListener('pointermove', onMove);\n  return () => window.removeEventListener('pointermove', onMove);\n}, []);",
      },
      {
        title: 'Not restoring a global',
        wrong: 'useEffect(() => {\n  document.title = title;\n}, [title]);',
        why: "After unmount the tab keeps this component's title.",
        right:
          'useEffect(() => {\n  const previous = document.title;\n  document.title = title;\n  return () => { document.title = previous; };\n}, [title]);',
      },
    ],
    edgeCases: [
      'Interval drift: for accurate clocks compute elapsed time from `performance.now()` rather than counting ticks.',
      'Background tabs throttle timers to ~1s or less often.',
    ],
    testing:
      'The tests spy on `add/removeEventListener` to assert the same handler is removed, use fake interval timers to drive the stopwatch and assert no timers remain after unmount, and verify `document.title` is set and restored.',
    production: [
      'Extract recurring patterns into hooks (`useEventListener`, `useInterval`) so cleanup is written once.',
    ],
  },
  {
    id: 'use-effect-websocket',
    title: 'useEffect — WebSocket connection',
    section: 'built-in',
    category: 'Effects',
    level: 'intermediate',
    summary:
      'Open a socket per channel, close it in the cleanup, and send through a ref without reconnecting.',
    tags: ['WebSocket', 'realtime', 'connection', 'cleanup', 'MSW', 'useRef'],
    demo: `${DIR}/UseEffectWebSocketDemo.tsx`,
    sources: [`${DIR}/UseEffectWebSocketDemo.tsx`],
    tests: [`${DIR}/UseEffectWebSocketDemo.test.tsx`],
    minReact: '16.8',
    support: {
      level: 'client-only',
      notes: 'The socket is served by MSW in the browser and in tests (`LIVE_SOCKET_URL`).',
    },
    officialDocs: [
      SYNC_DOCS,
      {
        label: 'MDN: WebSocket',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/WebSocket',
      },
    ],
    related: ['use-effect-fundamentals', 'use-effect-event', 'use-effect-strict-mode'],
    concept:
      'The connection is an external system whose lifetime matches "this component is showing channel X". The effect opens it, registers listeners, and the cleanup removes the listeners and closes it. Sending happens from event handlers via a ref.',
    problem:
      'Sockets opened in event handlers or without cleanup leak connections, duplicate messages after remounts and keep delivering to unmounted components.',
    whenToUse: [
      'Chat, notifications, live dashboards — any push channel tied to what is on screen.',
    ],
    whenNotToUse: [
      'A connection shared by many components — create it once in a module-level store and subscribe with `useSyncExternalStore`.',
      'Production apps needing reconnection, backoff and buffering — use a client library or a dedicated hook.',
    ],
    api: {
      signature:
        'useEffect(() => {\n  const socket = new WebSocket(url);\n  socket.addEventListener("message", onMessage);\n  return () => socket.close();\n}, [url]);',
    },
    execution: [
      'Mount: `new WebSocket(url)`; status "connecting" until `open` fires.',
      'Messages update state from the listener (not during render).',
      'Channel change: cleanup closes the old socket and removes its listeners, then a new socket opens.',
      'Unmount: the last socket is closed.',
    ],
    mistakes: [
      {
        title: 'Storing the socket in state',
        wrong: 'const [socket, setSocket] = useState<WebSocket | null>(null);',
        why: 'The UI never renders the socket; state causes extra renders and tempts you to depend on it in other effects.',
        right: 'const socketRef = useRef<WebSocket | null>(null); // read in handlers only',
      },
      {
        title: 'Reading state inside the connect effect',
        wrong:
          'useEffect(() => {\n  const s = new WebSocket(url);\n  s.onopen = () => notify(theme);\n}, [url, theme]); // reconnects on theme change',
        why: 'Non-reactive values in a connect effect force reconnects.',
        right:
          'const onOpen = useEffectEvent(() => notify(theme));\n// effect depends on [url] only',
      },
    ],
    edgeCases: [
      'Sending before `open` throws in some browsers — check `readyState === WebSocket.OPEN`.',
      'In Strict Mode development the socket opens, closes and re-opens once on mount — harmless with a correct cleanup.',
    ],
    testing:
      'The MSW `ws.link` handler intercepts `new WebSocket()` in jsdom. The test waits for `open` and the welcome message, sends a ping and a notification, then switches channels and unmounts, asserting the cleanup ran each time.',
    production: [
      'Add reconnection with exponential backoff, heartbeat pings and message buffering.',
      'Authenticate with short-lived tokens; never put long-lived secrets in the URL.',
    ],
  },
  {
    id: 'use-effect-stale-closures',
    title: 'useEffect — stale closures',
    section: 'built-in',
    category: 'Effects',
    level: 'intermediate',
    summary:
      "An interval created once keeps the first render's values; updater functions and honest dependencies fix it.",
    tags: ['stale closure', 'setInterval', 'exhaustive-deps', 'updater function', 'dependencies'],
    demo: `${DIR}/UseEffectStaleClosureDemo.tsx`,
    sources: [`${DIR}/UseEffectStaleClosureDemo.tsx`],
    tests: [`${DIR}/UseEffectStaleClosureDemo.test.tsx`],
    minReact: '16.8',
    support: { level: 'universal' },
    officialDocs: [
      {
        label: 'Removing effect dependencies',
        url: 'https://react.dev/learn/removing-effect-dependencies',
      },
      USE_EFFECT_DOCS,
    ],
    related: [
      'use-effect-event',
      'use-latest',
      'use-effect-subscriptions',
      'use-state-fundamentals',
    ],
    concept:
      "A closure captures the variables of the render that created it. A callback created by an effect with too few dependencies keeps reading that render's `count` and `step` forever.",
    problem:
      'Silencing `exhaustive-deps` to stop an effect from re-running is the most common source of "my interval/listener uses old values" bugs.',
    whenToUse: [
      'Recognise the pattern whenever a timer, listener or subscription reads state or props.',
    ],
    whenNotToUse: [
      'Do not "fix" it with refs written during render — write refs in effects (`useLatest`) or use `useEffectEvent`.',
    ],
    api: {
      signature:
        'useEffect(() => {\n  const id = setInterval(() => setCount((c) => c + step), 1000);\n  return () => clearInterval(id);\n}, [step]);',
    },
    execution: [
      'Render 1 creates the interval callback with `count = 0`, `step = 1`.',
      'Bug: deps `[running]` never change, so the callback is never recreated → `setCount(0 + 1)` every second.',
      'Fix: the updater reads the latest `count` from React, and `step` in deps recreates the interval when it changes.',
    ],
    mistakes: [
      {
        title: 'Silencing the linter',
        wrong:
          'useEffect(() => {\n  const id = setInterval(() => setCount(count + 1), 1000);\n  return () => clearInterval(id);\n  // eslint-disable-next-line react-hooks/exhaustive-deps\n}, []);',
        why: '`count` is frozen at 0, so the counter sticks at 1.',
        right:
          'useEffect(() => {\n  const id = setInterval(() => setCount((c) => c + 1), 1000);\n  return () => clearInterval(id);\n}, []);',
      },
    ],
    edgeCases: [
      'When a value must be read but should not restart the effect (e.g. a log level), use `useEffectEvent` (React 19.2+) or a ref updated in an effect.',
    ],
    testing:
      'Fake timers advance both counters side by side: the stale one stays at one step and ignores step changes, the fresh one counts and restarts its interval with the new step. Unmount leaves no timers.',
    production: [
      'Keep `react-hooks/exhaustive-deps` as an error; treat every suppression as a code-review question.',
    ],
  },
  {
    id: 'use-effect-race-conditions',
    title: 'useEffect — race conditions & AbortController',
    section: 'built-in',
    category: 'Effects',
    level: 'intermediate',
    summary:
      'With inverted latency, the buggy search shows a stale response; aborting in the cleanup guarantees only the latest query wins.',
    tags: ['race condition', 'AbortController', 'fetch', 'cancellation', 'ignore flag', 'search'],
    demo: `${DIR}/UseEffectRaceConditionDemo.tsx`,
    sources: [`${DIR}/UseEffectRaceConditionDemo.tsx`],
    tests: [`${DIR}/UseEffectRaceConditionDemo.test.tsx`],
    minReact: '16.8',
    support: { level: 'client-only' },
    officialDocs: [
      {
        label: 'useEffect: fetching data with effects',
        url: 'https://react.dev/reference/react/useEffect#fetching-data-with-effects',
      },
      {
        label: 'MDN: AbortController',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/AbortController',
      },
    ],
    related: ['use-effect-fundamentals', 'use-effect-strict-mode', 'you-might-not-need-an-effect'],
    concept:
      'Each effect run starts a request for its own query. The cleanup — which runs before the next run — aborts that request and sets an `ignore` flag, so a late response from an outdated query can never call `setState`.',
    problem:
      'Responses arrive in any order. Typing "j" → "ja" → "jav" against `/api/search` (shorter queries are slower) makes the "j" response arrive last and overwrite the "jav" results.',
    whenToUse: [
      'Any effect that starts async work whose result depends on props/state that can change before it finishes.',
    ],
    whenNotToUse: [
      'Production data fetching — TanStack Query or SWR handle cancellation, caching, deduplication and retries; frameworks provide loaders.',
    ],
    api: {
      signature:
        'useEffect(() => {\n  const controller = new AbortController();\n  fetch(url, { signal: controller.signal }).then(apply).catch(ignoreAbort);\n  return () => controller.abort();\n}, [url]);',
    },
    execution: [
      'Query "j": effect run 1 starts request A.',
      'Query "ja": cleanup 1 aborts A (its promise rejects with AbortError, ignored); run 2 starts B.',
      'Query "jav": cleanup 2 aborts B; run 3 starts C.',
      'Only C can call `setState`. In the buggy version A, B and C all apply, in arrival order.',
    ],
    mistakes: [
      {
        title: 'No cleanup',
        wrong:
          'useEffect(() => {\n  fetch(`/api/search?q=${q}`).then((r) => r.json()).then(setResults);\n}, [q]);',
        why: 'Whichever response arrives last wins, even if its query is outdated.',
        right:
          'useEffect(() => {\n  const controller = new AbortController();\n  fetch(`/api/search?q=${q}`, { signal: controller.signal })\n    .then((r) => r.json())\n    .then(setResults)\n    .catch((e) => { if (!controller.signal.aborted) setError(e); });\n  return () => controller.abort();\n}, [q]);',
      },
      {
        title: 'Treating an abort as an error',
        wrong: '.catch((error) => setError(error))',
        why: 'Every superseded request would flash an error.',
        right: '.catch((error) => { if (!controller.signal.aborted) setError(error); })',
      },
      {
        title: 'Storing `loading` with a synchronous setState in the effect',
        wrong: 'useEffect(() => {\n  setLoading(true);\n  /* fetch … */\n}, [q]);',
        why: 'An extra render per change; `react-hooks/set-state-in-effect` flags it.',
        right: 'const loading = applied.query !== q; // derive it from the last applied response',
      },
    ],
    edgeCases: [
      'The `ignore` flag also covers work that cannot be aborted (other promises, `response.json()` already in flight).',
      'An empty query starts no request; the panel derives "no results" in render.',
    ],
    testing:
      'An MSW `server.use` override gives fixed latencies (j 150 ms, ja 90 ms, jav 10 ms). The test types "jav", waits for the buggy panel to end on "j" and asserts the fixed panel shows only "jav" results, logged aborts for "j" and "ja", and no applied stale response.',
    production: [
      'Debounce user input in addition to cancelling (fewer requests).',
      'Pass the `signal` to every layer (fetch wrappers, SDKs) so aborts actually stop work.',
    ],
    diagram: {
      title: 'Cancelling superseded requests',
      description:
        'Each query change runs the previous cleanup, which aborts the in-flight request; only the latest response is applied.',
      mermaid: `sequenceDiagram
  participant U as User
  participant E as Effect
  participant S as /api/search
  U->>E: query = j
  E->>S: request A (slow)
  U->>E: query = ja
  E-->>S: cleanup aborts A
  E->>S: request B
  U->>E: query = jav
  E-->>S: cleanup aborts B
  E->>S: request C (fast)
  S-->>E: response C
  E->>U: setResults(C)
  Note over E,S: A and B were aborted, so they can never overwrite C`,
    },
  },
  {
    id: 'use-effect-strict-mode',
    title: 'useEffect — Strict Mode double mount',
    section: 'built-in',
    category: 'Effects',
    level: 'intermediate',
    summary:
      'In development, Strict Mode runs setup → cleanup → setup on mount to prove your cleanup works.',
    tags: ['StrictMode', 'double render', 'development', 'cleanup', 'effects run twice'],
    demo: `${DIR}/UseEffectStrictModeDemo.tsx`,
    sources: [`${DIR}/UseEffectStrictModeDemo.tsx`],
    tests: [`${DIR}/UseEffectStrictModeDemo.test.tsx`],
    minReact: '18.0',
    support: {
      level: 'universal',
      notes: 'Effect double-invocation exists since React 18 and only in development builds.',
    },
    officialDocs: [
      { label: 'StrictMode', url: 'https://react.dev/reference/react/StrictMode' },
      {
        label: 'How to handle the effect firing twice in development',
        url: 'https://react.dev/learn/synchronizing-with-effects#how-to-handle-the-effect-firing-twice-in-development',
      },
    ],
    related: ['use-effect-fundamentals', 'use-effect-websocket', 'use-effect-race-conditions'],
    concept:
      '`<StrictMode>` simulates an immediate unmount and remount for newly mounted components in development, so every effect runs setup → cleanup → setup. Production builds run it once.',
    problem:
      'Effects without a correct cleanup (double connections, duplicated listeners, analytics fired twice) fail in production too — when a user navigates away and back, or React re-mounts a subtree. Strict Mode surfaces this immediately.',
    whenToUse: [
      'Wrap the whole app in `<StrictMode>` in development (Vite and most templates do).',
    ],
    whenNotToUse: ['Do not try to opt individual effects out; fix the cleanup instead.'],
    api: { signature: '<StrictMode>\n  <App />\n</StrictMode>' },
    execution: [
      'Mount: render (twice in dev) → commit → effect setup.',
      'Strict Mode then runs every cleanup and every setup again.',
      'A correct effect ends in the same state as a single run: exactly one live connection.',
    ],
    mistakes: [
      {
        title: 'A "did run" ref guard',
        wrong:
          'const didConnect = useRef(false);\nuseEffect(() => {\n  if (didConnect.current) return;\n  didConnect.current = true;\n  connect();\n}, []);',
        why: 'Hides the missing cleanup in development; the leak still happens on real remounts.',
        right: 'useEffect(() => {\n  const c = connect();\n  return () => c.disconnect();\n}, []);',
      },
    ],
    edgeCases: [
      'Strict Mode cannot be turned off for a subtree — if the app root is strict, everything is.',
      'In React 19.3 (the version used here), a nested `<StrictMode>` does not add the extra effect cycle during the very first render of a root; the demo therefore compares on a later mount (unmount → mount).',
      'Fetch effects without cancellation issue two requests in development; add an AbortController.',
    ],
    testing:
      'Vitest runs a development build, so the test unmounts and re-mounts both rooms and asserts the Strict panel logs connect → disconnect → connect while the normal panel logs one connect, with balanced connects/disconnects.',
    production: [
      'Keep Strict Mode on in development; it also double-invokes renders, updaters and reducers to catch impurity.',
    ],
  },
  {
    id: 'you-might-not-need-an-effect',
    title: 'You might not need an effect',
    section: 'built-in',
    category: 'Effects',
    level: 'intermediate',
    summary:
      'Derive values during render and put event logic in handlers — with render counts and a notification bug to show why.',
    tags: [
      'derived state',
      'event handlers',
      'unnecessary effects',
      'set-state-in-effect',
      'render count',
    ],
    demo: `${DIR}/YouMightNotNeedAnEffectDemo.tsx`,
    sources: [`${DIR}/YouMightNotNeedAnEffectDemo.tsx`],
    tests: [`${DIR}/YouMightNotNeedAnEffectDemo.test.tsx`],
    minReact: '16.8',
    support: { level: 'universal' },
    officialDocs: [
      {
        label: 'You might not need an effect',
        url: 'https://react.dev/learn/you-might-not-need-an-effect',
      },
    ],
    related: ['use-state-derived-state', 'use-effect-fundamentals', 'use-effect-race-conditions'],
    concept:
      "Effects are for synchronising with external systems. Data transformations belong in render; reactions to a specific user action belong in that action's event handler.",
    problem:
      'An effect that copies derived data into state renders twice per change (once stale). An effect that reacts to state to "notify the user" fires for every reason the state changed — including restoring a saved cart.',
    whenToUse: [
      'Review every `useEffect` that only calls `setState` with values from props/state.',
      'Review every effect that checks a flag set by an event handler.',
    ],
    whenNotToUse: [
      'Synchronising with something outside React (network, DOM APIs, subscriptions) — that is what effects are for.',
    ],
    api: {
      signature:
        "const visible = items.filter((i) => i.includes(query)); // derive in render\nfunction onAdd() { setCount(count + 1); notify('Added'); } // event logic in the handler",
    },
    execution: [
      'Effect version: render with stale `visible` → commit → effect → `setVisible` → second render/commit.',
      'Derived version: one render computes `visible` from `query` directly.',
      'Event logic in an effect runs after *any* state change; in the handler it runs only for that interaction.',
    ],
    mistakes: [
      {
        title: 'Syncing derived data with an effect',
        wrong:
          'const [visible, setVisible] = useState(items);\nuseEffect(() => {\n  setVisible(items.filter(matches(query)));\n}, [items, query]);',
        why: 'Double render, a stale frame, and more state to keep consistent. `react-hooks/set-state-in-effect` reports it.',
        right: 'const visible = items.filter(matches(query));',
      },
      {
        title: 'Event-specific logic in an effect',
        wrong: "useEffect(() => {\n  if (count > 0) showToast('Added to cart!');\n}, [count]);",
        why: 'Fires when the count changes for any reason (restoring a cart, a server sync, a remount).',
        right:
          "function handleAdd() {\n  setCount((c) => c + 1);\n  showToast('Added to cart!');\n}",
      },
      {
        title: 'Resetting state when a prop changes',
        wrong: "useEffect(() => {\n  setComment('');\n}, [userId]);",
        why: 'Renders once with the old comment.',
        right: '<Profile key={userId} userId={userId} />',
      },
    ],
    edgeCases: [
      'Expensive derivations: wrap them in `useMemo` rather than moving them into an effect.',
    ],
    testing:
      'RenderCount (`<Profiler>`) measures commits: typing three characters costs 8 commits with the effect and 4 when derived. Restoring a saved cart logs a false "Added to cart!" only in the effect version.',
    production: [
      'Enable `react-hooks/set-state-in-effect` (part of `recommended-latest`) to catch these automatically.',
    ],
  },
  {
    id: 'use-layout-effect',
    title: 'useLayoutEffect — measure before paint',
    section: 'built-in',
    category: 'Effects',
    level: 'advanced',
    summary:
      'A tooltip measures its height and flips above/below its trigger; with useEffect the wrong position can flash first.',
    tags: ['useLayoutEffect', 'layout', 'measure', 'tooltip', 'flicker', 'getBoundingClientRect'],
    demo: `${DIR}/UseLayoutEffectDemo.tsx`,
    sources: [`${DIR}/UseLayoutEffectDemo.tsx`, `${DIR}/UseLayoutEffectDemo.css`],
    tests: [`${DIR}/UseLayoutEffectDemo.test.tsx`],
    minReact: '16.8',
    support: {
      level: 'client-only',
      notes:
        'Layout effects do not run on the server; use an isomorphic wrapper or render the measured UI client-side only.',
    },
    officialDocs: [
      { label: 'useLayoutEffect', url: 'https://react.dev/reference/react/useLayoutEffect' },
    ],
    related: ['use-effect-fundamentals', 'use-insertion-effect', 'use-ref-dom-and-values'],
    concept:
      '`useLayoutEffect` runs synchronously after React updates the DOM and *before* the browser paints. State set there re-renders before the user sees anything, so measure-then-position UI never shows the intermediate frame.',
    problem:
      'A tooltip cannot know whether it fits above its trigger until it is in the DOM and measured. Measuring in `useEffect` lets the browser paint the unmeasured position first — a visible jump.',
    whenToUse: [
      'Measuring layout (size, position, scroll) and adjusting before paint: tooltips, popovers, auto-sizing text areas, scroll restoration.',
    ],
    whenNotToUse: [
      'Everything else — it blocks painting, so slow code there makes the app feel slower.',
      'Server-rendered markup that depends on the measurement — layout effects do not run on the server, so the HTML shows the unmeasured state until hydration.',
    ],
    api: {
      signature:
        'function useLayoutEffect(setup: () => void | (() => void), deps?: DependencyList): void',
    },
    execution: [
      'Render: tooltip renders at a guess (height unknown).',
      'Commit: DOM updated. Layout effects run now: measure, `setHeight(...)`.',
      'React re-renders synchronously with the real position, still before paint.',
      'Browser paints once, in the final position. Passive effects (`useEffect`) run after that.',
    ],
    mistakes: [
      {
        title: 'Measuring in useEffect',
        wrong:
          'useEffect(() => {\n  setHeight(ref.current!.getBoundingClientRect().height);\n}, []);',
        why: 'The browser may already have painted the unmeasured frame; the tooltip jumps.',
        right:
          'useLayoutEffect(() => {\n  setHeight(ref.current!.getBoundingClientRect().height);\n}, []);',
      },
      {
        title: 'Heavy work in a layout effect',
        wrong: 'useLayoutEffect(() => {\n  sendAnalytics();\n  buildSearchIndex();\n}, []);',
        why: 'Blocks the paint for every user.',
        right: 'useEffect(() => {\n  sendAnalytics();\n}, []);',
      },
    ],
    edgeCases: [
      'Effects triggered by discrete events (clicks) are often flushed before paint even with `useEffect`; hover/pointer updates show the difference more reliably. The demo has an "exaggerate" option that blocks inside the effect to make the in-between frame visible.',
      'A new trigger remounts the tooltip (`key`) so it is measured again.',
    ],
    testing:
      'jsdom has no layout, so the test stubs `getBoundingClientRect` for the stage, triggers and tooltip, then asserts placement (above / flipped below), the computed `top`, `aria-describedby` and removal on pointer leave for both variants.',
    production: [
      'Prefer CSS anchor positioning or a positioning library (Floating UI) for complex popovers.',
      'Respect `prefers-reduced-motion` for any movement you add.',
    ],
  },
  {
    id: 'use-insertion-effect',
    title: 'useInsertionEffect — CSS-in-JS style injection',
    section: 'built-in',
    category: 'Effects',
    level: 'advanced',
    summary:
      'A tiny CSS-in-JS hook hashes declarations into a class and injects a ref-counted `<style>` before layout effects run.',
    tags: ['useInsertionEffect', 'CSS-in-JS', 'style injection', 'library authors', 'hash'],
    demo: `${DIR}/UseInsertionEffectDemo.tsx`,
    sources: [`${DIR}/useScopedCss.ts`, `${DIR}/UseInsertionEffectDemo.tsx`],
    tests: [`${DIR}/UseInsertionEffectDemo.test.tsx`],
    minReact: '18.0',
    support: {
      level: 'client-only',
      notes: 'Does not run on the server; real libraries collect styles during SSR separately.',
    },
    officialDocs: [
      { label: 'useInsertionEffect', url: 'https://react.dev/reference/react/useInsertionEffect' },
    ],
    related: ['use-layout-effect', 'use-effect-fundamentals'],
    concept:
      '`useInsertionEffect` fires before React mutates the DOM and before any layout effect. CSS-in-JS libraries use it to insert `<style>` rules so that layout effects reading styles see the final CSS.',
    problem:
      'Injecting styles during render is impure and slow (style recalculation on every render); injecting them in `useLayoutEffect` is too late if another layout effect measures the element first.',
    whenToUse: ['Only when writing a CSS-in-JS library or a similar global-resource injector.'],
    whenNotToUse: [
      'Application code: use CSS files, CSS Modules or your styling library.',
      'Anything that needs refs or updates state — refs are not attached yet and state updates are not allowed.',
    ],
    api: {
      signature:
        'function useInsertionEffect(setup: () => void | (() => void), deps?: DependencyList): void',
    },
    execution: [
      'Render: compute the class name from a hash of the declarations (pure).',
      'Before DOM mutations: insertion effects run → the `<style>` tag is inserted (or its ref count incremented).',
      'DOM mutations, then layout effects (which now see the styles), paint, passive effects.',
      'Cleanup on change/unmount decrements the ref count and removes the tag at zero.',
    ],
    mistakes: [
      {
        title: 'Injecting styles during render',
        wrong:
          "function useCss(rule: string) {\n  const style = document.createElement('style');\n  style.textContent = rule;\n  document.head.appendChild(style); // every render!\n}",
        why: 'Impure, duplicates tags, breaks on the server and with concurrent rendering.',
        right:
          'useInsertionEffect(() => {\n  /* insert once, ref-count, return cleanup */\n}, [rule]);',
      },
      {
        title: 'Setting state in an insertion effect',
        wrong: 'useInsertionEffect(() => {\n  setInjected(true);\n});',
        why: 'Insertion effects cannot schedule updates; React warns.',
      },
    ],
    edgeCases: [
      'Identical declarations share one tag; the demo\'s "Inspect <head>" shows exactly one tag no matter how many boxes use it.',
      'Changing the declarations swaps the tag: new hash inserted, old one removed when unused.',
    ],
    testing:
      "Tests cover the hash, shared ref-counted injection with removal after the last unmount, swapping rules on change, and the demo's class names and `<head>` contents.",
    production: [
      'Use a mature library (Emotion, styled-components, vanilla-extract, Panda) — they handle SSR extraction, ordering and nonce-based CSP.',
    ],
  },
  {
    id: 'use-effect-event',
    title: 'useEffectEvent — non-reactive logic in effects',
    section: 'built-in',
    category: 'Effects',
    level: 'advanced',
    summary:
      'A chat connection depends on `roomId` only, while its "connected" notification reads the latest theme through an Effect Event.',
    tags: [
      'useEffectEvent',
      'effect event',
      'React 19.2',
      'dependencies',
      'chat room',
      'stale closure',
    ],
    demo: `${DIR}/UseEffectEventDemo.tsx`,
    sources: [`${DIR}/UseEffectEventDemo.tsx`],
    tests: [`${DIR}/UseEffectEventDemo.test.tsx`],
    minReact: '19.2',
    support: { level: 'universal', notes: 'Stable since React 19.2.' },
    officialDocs: [
      { label: 'useEffectEvent', url: 'https://react.dev/reference/react/useEffectEvent' },
      {
        label: 'Separating events from effects',
        url: 'https://react.dev/learn/separating-events-from-effects',
      },
    ],
    related: [
      'use-effect-stale-closures',
      'use-latest',
      'use-effect-websocket',
      'use-effect-fundamentals',
    ],
    concept:
      '`useEffectEvent(fn)` returns a function you call from inside effects. It always sees the latest props and state, but it is not reactive: reading `theme` inside it does not make `theme` an effect dependency.',
    problem:
      'An effect that connects to a room and shows a themed notification must list `theme` as a dependency, so toggling the theme disconnects and reconnects — a reconnect the user never asked for.',
    whenToUse: [
      'Logic called from an effect (or from callbacks the effect registers) that needs fresh values but should not re-trigger the effect: notifications, logging, analytics with current state.',
    ],
    whenNotToUse: [
      'Event handlers for JSX (`onClick`) — they already see the latest values.',
      'To hide genuinely reactive dependencies: if the effect *should* re-run for a value, keep it in the deps.',
      'Before React 19.2 — use a ref updated in an effect (see `useLatest`).',
    ],
    api: {
      signature: 'function useEffectEvent<T extends Function>(callback: T): T',
      returns:
        'A function to call only from inside effects. Its identity is intentionally unstable — never pass it to other components or list it in dependencies.',
    },
    execution: [
      "Render: `useEffectEvent` records the latest `callback` (closing over this render's `theme`).",
      'Effect (deps `[roomId]`) connects and registers `() => onConnected(roomId)`.',
      'Theme changes → re-render → the Effect Event now points to the new callback; the effect does not re-run.',
      'When the connection fires, `onConnected` runs with the latest theme.',
    ],
    mistakes: [
      {
        title: 'Listing an Effect Event as a dependency',
        wrong: 'useEffect(() => {\n  onConnected();\n}, [roomId, onConnected]);',
        why: 'The linter rejects it; Effect Events are not reactive values.',
        right: 'useEffect(() => {\n  onConnected();\n}, [roomId]);',
      },
      {
        title: 'Passing it to another component or calling it during render',
        wrong: '<Child onReady={onConnected} />',
        why: 'Effect Events may only be called from inside effects of the component that declared them.',
        right: '// Pass a regular callback (or useCallback) to children instead.',
      },
    ],
    edgeCases: [
      'React 19.3 fixed Effect Events reading stale values inside `memo()` and `forwardRef` components.',
      'An Effect Event called from a pending timer after the theme changed sees the new theme — the test covers this.',
    ],
    testing:
      'Fake timers drive the fake connection. The test asserts the naive room reconnects on a theme toggle while the Effect Event room does not, and that a room change reconnects with the notification reading the latest theme.',
    production: [
      'Keep `eslint-plugin-react-hooks` up to date (this repo uses v7) so the linter knows Effect Events are not dependencies.',
    ],
  },
];
