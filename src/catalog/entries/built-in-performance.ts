import type { CatalogEntry } from '../types';

const P = 'examples/built-in/performance';
const CATEGORY = 'Performance';

const REACT_COMPILER_DOCS = {
  label: 'React Compiler',
  url: 'https://react.dev/learn/react-compiler',
};

export const entries: CatalogEntry[] = [
  {
    id: 'use-memo',
    title: 'useMemo',
    section: 'built-in',
    category: CATEGORY,
    level: 'intermediate',
    summary:
      'Cache the result of an expensive calculation, or keep an object identity stable, between renders.',
    tags: ['memoization', 'performance', 'referential equality', 'dependencies', 'profiling'],
    demo: `${P}/UseMemoDemo.tsx`,
    sources: [`${P}/UseMemoDemo.tsx`, `${P}/workload.ts`],
    tests: [`${P}/UseMemoDemo.test.tsx`],
    minReact: '16.8',
    support: { level: 'universal' },
    officialDocs: [
      { label: 'useMemo', url: 'https://react.dev/reference/react/useMemo' },
      {
        label: 'How to tell if a calculation is expensive',
        url: 'https://react.dev/reference/react/useMemo#how-to-tell-if-a-calculation-is-expensive',
      },
    ],
    related: ['use-callback', 'memo', 'memoization-pitfalls', 'react-compiler', 'profiler'],
    concept:
      '`useMemo(calculate, deps)` calls `calculate` during render and returns the cached result on later renders while every dependency is `Object.is`-equal to the previous render’s.',
    problem:
      'A slow pure calculation (filtering/sorting thousands of rows) re-runs on every render, even when the render was caused by unrelated state. And an object created during render is a *new* object each time, which re-triggers effects and defeats `memo` children.',
    whenToUse: [
      'A pure calculation that profiling shows is noticeably slow (≈1 ms or more with CPU throttling).',
      'A value passed to a `memo()` child or used as an effect/hook dependency, where its identity matters.',
      'With React Compiler enabled, as an escape hatch for precise control (for example an effect dependency).',
    ],
    whenNotToUse: [
      'Cheap calculations — the bookkeeping (dependency comparison, cache) can cost more than the work.',
      'To make an effect run “less often” when it really depends on primitives — depend on the primitives instead.',
      'As a semantic guarantee: React may discard the cache (e.g. on remount, or in development with Fast Refresh). Code must be correct without it.',
      'Side effects or data fetching — use an effect, an event handler or a data library (`react-hooks/use-memo` and `void-use-memo` flag this).',
    ],
    api: {
      signature: 'function useMemo<T>(calculateValue: () => T, dependencies: DependencyList): T',
      params: [
        {
          name: 'calculateValue',
          type: '() => T',
          description:
            'Pure function, no arguments. Called during render (twice in Strict Mode development).',
        },
        {
          name: 'dependencies',
          type: 'readonly unknown[]',
          description: 'Every reactive value the calculation reads. Compared with `Object.is`.',
        },
      ],
      returns:
        'The cached value, or the result of calling `calculateValue` again if a dependency changed.',
    },
    execution: [
      'First render: `calculateValue()` runs and its result is stored with the dependency list.',
      'Later renders: each dependency is compared with `Object.is`; if all are equal the cached value is returned without calling `calculateValue`.',
      'Strict Mode (dev): `calculateValue` is called twice to surface impurity; one result is kept.',
      'Nothing happens in commit or cleanup — `useMemo` is purely a render-time cache.',
    ],
    mistakes: [
      {
        title: 'Memoising, then passing the result through a new object',
        wrong:
          'const items = useMemo(() => sort(list), [list]);\nreturn <Table data={{ items }} />;',
        why: 'The wrapper object is new on every render, so a `memo(Table)` re-renders anyway.',
        right:
          'const data = useMemo(() => ({ items: sort(list) }), [list]);\nreturn <Table data={data} />;',
      },
      {
        title: 'Missing dependency',
        wrong: 'const visible = useMemo(() => filter(rows, query), [rows]);',
        why: 'The cached value is stale when `query` changes. `exhaustive-deps` and `preserve-manual-memoization` report it.',
        right: 'const visible = useMemo(() => filter(rows, query), [rows, query]);',
      },
    ],
    edgeCases: [
      'Measuring inside the calculation (`performance.now()`) is impure and flagged by `react-hooks/purity`; the demo measures with `<Profiler>` and in an event handler instead.',
      'Switching memoisation on/off must not call `useMemo` conditionally — the demo always calls it and returns `null` when “off”.',
    ],
    testing:
      'The demo test filters rows, checks the event-handler benchmark renders a millisecond value, and counts effect runs to prove a memoised object keeps an effect from re-running on unrelated renders.',
    production: [
      'Profile a production build (or the profiling build) before and after; development timings are inflated.',
      'Prefer restructuring (moving state down, passing children) before reaching for memoisation.',
    ],
  },
  {
    id: 'use-callback',
    title: 'useCallback',
    section: 'built-in',
    category: CATEGORY,
    level: 'intermediate',
    summary:
      'Keep a function’s identity stable between renders — useful only when that identity matters.',
    tags: ['memoization', 'callbacks', 'memo', 'referential equality'],
    demo: `${P}/UseCallbackDemo.tsx`,
    sources: [`${P}/UseCallbackDemo.tsx`],
    tests: [`${P}/UseCallbackDemo.test.tsx`],
    minReact: '16.8',
    support: { level: 'universal' },
    officialDocs: [{ label: 'useCallback', url: 'https://react.dev/reference/react/useCallback' }],
    related: ['memo', 'use-memo', 'memoization-pitfalls', 'react-compiler'],
    concept:
      '`useCallback(fn, deps)` returns the same function object across renders until a dependency changes. It is `useMemo(() => fn, deps)`.',
    problem:
      'Every render creates new function objects. A `memo()` child receiving one as a prop sees a changed prop and re-renders; an effect depending on one re-runs.',
    whenToUse: [
      'A callback passed to a component wrapped in `memo` (as in the demo: typing in an unrelated field no longer re-renders the list).',
      'A callback used as a dependency of an effect or another Hook, or returned from a custom Hook that consumers may put in dependency arrays.',
    ],
    whenNotToUse: [
      'Handlers passed to DOM elements (`<button onClick>`) — DOM elements do not skip renders.',
      'When the child is not memoised — it re-renders with its parent regardless.',
      'To read the latest props/state inside a long-lived callback without re-subscribing — use `useEffectEvent` inside effects, or a latest-ref pattern.',
    ],
    api: {
      signature:
        'function useCallback<T extends Function>(callback: T, dependencies: DependencyList): T',
      returns: 'The cached function, or `callback` from this render if a dependency changed.',
    },
    execution: [
      'Render: React compares the dependencies; if unchanged it returns the function stored on a previous render, otherwise stores and returns the new one.',
      'The function body does not run during render — only when called.',
    ],
    mistakes: [
      {
        title: 'Wrapping in useCallback, then creating a new function anyway',
        wrong:
          'const select = useCallback((id) => setSelected(id), []);\nrows.map((row) => <Row onClick={() => select(row.id)} />);',
        why: 'The inline arrow is new each render, so `memo(Row)` still re-renders.',
        right: 'rows.map((row) => <Row id={row.id} onSelect={select} />);',
      },
    ],
    testing:
      'The test types into an unrelated input and asserts the memoised list’s commit counter (a `<Profiler>` inside the `memo` child) stays at 1 with useCallback and increments without it.',
  },
  {
    id: 'memo',
    title: 'memo (component API)',
    section: 'built-in',
    category: CATEGORY,
    level: 'intermediate',
    summary:
      'Not a Hook: wraps a component so React can skip re-rendering it when its props are equal — with an optional custom comparison.',
    tags: ['React.memo', 'arePropsEqual', 'shallow compare', 'component api', 'performance'],
    demo: `${P}/MemoDemo.tsx`,
    sources: [`${P}/MemoDemo.tsx`],
    tests: [`${P}/MemoDemo.test.tsx`],
    minReact: '16.6',
    support: { level: 'universal' },
    officialDocs: [{ label: 'memo', url: 'https://react.dev/reference/react/memo' }],
    related: ['use-callback', 'use-memo', 'memoization-pitfalls', 'react-compiler'],
    concept:
      '`memo(Component, arePropsEqual?)` returns a component that re-renders only when a prop changes (each prop compared with `Object.is`), or when `arePropsEqual(prev, next)` returns `false`. Its own state and context changes still re-render it.',
    problem:
      'When a parent re-renders, all its children re-render. For expensive subtrees whose props rarely change, that is wasted work.',
    whenToUse: [
      'A component that is measurably slow to render and often re-renders with the same props.',
      'A custom `arePropsEqual` when a prop is a new-but-equivalent value you cannot stabilise upstream (the demo compares array contents).',
    ],
    whenNotToUse: [
      'Components that receive new objects, arrays, functions or JSX `children` on every render — the comparison always fails.',
      'Deep-equality comparisons of large props — they can be slower than re-rendering, and they freeze the UI while comparing.',
      'A custom comparison that ignores a function prop: the child keeps calling a stale closure.',
    ],
    api: {
      signature:
        'function memo<P>(Component: ComponentType<P>, arePropsEqual?: (prevProps: Readonly<P>, nextProps: Readonly<P>) => boolean): MemoExoticComponent<ComponentType<P>>',
      returns: 'A new component. Calling it is otherwise identical to the wrapped component.',
    },
    execution: [
      'Parent render: React reaches the memo component and compares old and new props.',
      'Equal → the previous result is reused; the component and its subtree are skipped.',
      'Not equal (or its own state/context changed) → it renders normally.',
    ],
    mistakes: [
      {
        title: 'Inline objects defeat memo',
        wrong: '<MemoChart options={{ animate: true }} />',
        why: 'A new object every render — the shallow comparison never passes.',
        right:
          'const chartOptions = { animate: true }; // module scope\n<MemoChart options={chartOptions} />',
      },
    ],
    testing:
      'Three versions of the same chart (plain, `memo`, `memo` + `arePropsEqual`) count their commits after a parent-only render, an equal-copy update and a real change.',
  },
  {
    id: 'use-transition',
    title: 'useTransition',
    section: 'built-in',
    category: CATEGORY,
    level: 'advanced',
    summary:
      'Mark an update as non-urgent so slow rendering never blocks typing or clicking, with an isPending flag.',
    tags: ['concurrent', 'startTransition', 'isPending', 'interruptible', 'tabs', 'responsiveness'],
    demo: `${P}/UseTransitionDemo.tsx`,
    sources: [`${P}/UseTransitionDemo.tsx`, `${P}/workload.ts`],
    tests: [`${P}/UseTransitionDemo.test.tsx`],
    minReact: '18.0',
    support: { level: 'universal' },
    officialDocs: [
      { label: 'useTransition', url: 'https://react.dev/reference/react/useTransition' },
      { label: 'startTransition', url: 'https://react.dev/reference/react/startTransition' },
    ],
    related: [
      'use-deferred-value',
      'use-transition-actions',
      'debounce-vs-deferred',
      'large-lists',
    ],
    concept:
      '`const [isPending, startTransition] = useTransition()`. State updates inside `startTransition(fn)` render at low priority in the background; React keeps showing the current UI (with `isPending === true`) and throws the background render away if an urgent update arrives.',
    problem:
      'Switching to a tab that renders hundreds of slow components freezes the page: clicks and keystrokes wait for the render to finish.',
    whenToUse: [
      'Navigation-like updates that render a lot (tabs, routes, filters over big lists).',
      'Updates that may suspend, to keep already-visible content instead of showing a Suspense fallback.',
      'Since React 19, async work: `startTransition(async () => …)` — see Async transitions (Actions).',
    ],
    whenNotToUse: [
      'Controlled input values — the input itself must update urgently (update it outside the transition, as the demo does).',
      'To reduce network requests — transitions change rendering priority, not how often code runs; debounce for that.',
      'When the slowness is in an effect or a synchronous calculation outside rendering — transitions only interrupt between components.',
    ],
    api: {
      signature:
        'function useTransition(): [isPending: boolean, startTransition: (action: () => void | Promise<void>) => void]',
      returns:
        '`isPending` (true while a transition is in progress) and a stable `startTransition` function.',
    },
    execution: [
      'Click: `startTransition` marks the updates inside it as Transition updates. React first commits an urgent render with `isPending = true`.',
      'React renders the new state in the background, yielding to the browser between components.',
      'If an urgent update arrives (another click, a keystroke) the background render is abandoned and restarted with the latest state.',
      'When it completes, React commits it and `isPending` becomes false in the same commit.',
    ],
    mistakes: [
      {
        title: 'Putting the input value in the transition',
        wrong: 'onChange={(e) => startTransition(() => setQuery(e.target.value))}',
        why: 'The input renders the old value until the transition completes, so typing feels broken.',
        right:
          'onChange={(e) => {\n  setQuery(e.target.value);\n  startTransition(() => setListQuery(e.target.value));\n}}',
      },
    ],
    edgeCases: [
      'Pending state is only observable outside `act()` in tests; the test leaves the act environment and uses native clicks.',
      'React 19.3 renders independent transitions separately, so a slow one no longer holds up unrelated ones.',
    ],
    testing:
      'The tab test asserts the “Rendering in the background…” indicator and the still-visible previous panel, then the finished posts list. A second test switches transitions off; a third filters 2,000 rows behind a transition.',
    diagram: {
      title: 'An interrupted transition',
      description: 'An urgent click arrives while a transition is rendering in the background.',
      mermaid: [
        'sequenceDiagram',
        '  participant U as User',
        '  participant R as React',
        '  U->>R: click Posts (startTransition)',
        '  R->>R: urgent commit, isPending = true',
        '  R->>R: render Posts in background',
        '  U->>R: click Contact (urgent)',
        '  R->>R: abandon Posts render',
        '  R->>R: commit Contact, isPending = false',
      ].join('\n'),
    },
  },
  {
    id: 'use-deferred-value',
    title: 'useDeferredValue',
    section: 'built-in',
    category: CATEGORY,
    level: 'advanced',
    summary:
      'Let a slow part of the UI lag behind a fast-changing value, and show it as stale meanwhile.',
    tags: ['concurrent', 'deferred', 'stale', 'search', 'initialValue'],
    demo: `${P}/UseDeferredValueDemo.tsx`,
    sources: [`${P}/UseDeferredValueDemo.tsx`, `${P}/workload.ts`],
    tests: [`${P}/UseDeferredValueDemo.test.tsx`],
    minReact: '18.0',
    support: {
      level: 'universal',
      notes: 'The `initialValue` argument requires React 19.0.',
    },
    officialDocs: [
      { label: 'useDeferredValue', url: 'https://react.dev/reference/react/useDeferredValue' },
    ],
    related: ['use-transition', 'debounce-vs-deferred', 'memo', 'large-lists'],
    concept:
      '`useDeferredValue(value, initialValue?)` returns the previous value during urgent renders and schedules a background render with the new value. Comparing `value !== deferredValue` tells you the UI is stale.',
    problem:
      'A search box drives a list that takes 100+ ms to render; every keystroke blocks the input. You often don’t own the code that sets the state, so you can’t wrap it in `startTransition`.',
    whenToUse: [
      'You receive a fast-changing value (prop or state) and render something slow from it.',
      'Showing stale results (dimmed) instead of a spinner while new results render or suspend.',
      '`initialValue` (19+): render a cheap placeholder on mount and the real content right after, without blocking the first paint.',
    ],
    whenNotToUse: [
      'Without `memo` on the slow child: it would re-render with the parent on every keystroke anyway.',
      'To throttle network requests — rendering is deferred, but an effect keyed on the deferred value still runs for most values; debounce requests instead.',
    ],
    api: {
      signature: 'function useDeferredValue<T>(value: T, initialValue?: T): T',
      params: [
        {
          name: 'value',
          type: 'T',
          description: 'The value to defer. Primitives or values created outside render.',
        },
        {
          name: 'initialValue',
          type: 'T',
          optional: true,
          description:
            'React 19+: returned on the initial render; then React re-renders in the background with `value`.',
        },
      ],
      returns:
        'The old value during the urgent render, the new value after the background render commits.',
    },
    execution: [
      'Urgent render: the hook returns the previous value, so memoised children skip work.',
      'React schedules a background render with the new value; a newer value abandons it.',
      'The background render commits; `deferred === value` again.',
    ],
    mistakes: [
      {
        title: 'Deferring an object created during render',
        wrong: 'const deferred = useDeferredValue({ query });',
        why: 'A new object every render means the deferred value never “catches up” and React keeps scheduling background renders.',
        right: 'const deferredQuery = useDeferredValue(query);',
      },
    ],
    testing:
      'Tests type outside `act()` to observe the stale badge and the old results, then wait for the up-to-date list; another remounts the summary to observe the `initialValue` placeholder.',
  },
  {
    id: 'debounce-vs-deferred',
    title: 'Debounce vs deferred rendering',
    section: 'built-in',
    category: CATEGORY,
    level: 'intermediate',
    summary:
      'Debouncing delays work until input pauses; deferred rendering starts work immediately at low priority and interrupts it.',
    tags: ['debounce', 'useDeferredValue', 'throttle', 'search', 'responsiveness'],
    demo: `${P}/DebounceVsDeferredDemo.tsx`,
    sources: [`${P}/DebounceVsDeferredDemo.tsx`],
    tests: [`${P}/DebounceVsDeferredDemo.test.tsx`],
    minReact: '18.0',
    support: { level: 'universal' },
    officialDocs: [
      {
        label: 'How is deferring a value different from debouncing and throttling?',
        url: 'https://react.dev/reference/react/useDeferredValue#how-is-deferring-a-value-different-from-debouncing-and-throttling',
      },
    ],
    related: ['use-deferred-value', 'use-transition', 'use-debounce'],
    concept:
      'Two lists filter the same input. The debounced list renders once, 300 ms after typing stops. The deferred list renders as soon as possible after every keystroke, at low priority, and drops renders that a newer keystroke makes obsolete.',
    problem:
      'Both are offered as “the fix for laggy search”, but they solve different problems: debounce limits *how often* work runs; deferring changes *when/at what priority* rendering runs.',
    whenToUse: [
      'Debounce/throttle: expensive side effects — network requests, analytics, autosave, resize handlers.',
      'Deferred rendering: expensive *rendering* — no fixed delay to tune, fast devices update almost instantly.',
      'Combine them: debounce the fetch, defer the rendering of results.',
    ],
    whenNotToUse: [
      'Debounce for rendering-only work: it adds latency on every device and still blocks once it fires.',
      'Deferred rendering to reduce requests: it does not reduce how many times effects run for settled values.',
    ],
    execution: [
      'Keystroke → the input commits urgently.',
      'Deferred list: a background render starts now; the next keystroke interrupts it.',
      'Debounced list: the effect’s timer is cleared and restarted; nothing renders until it fires.',
    ],
    testing:
      'Fake timers (only `setTimeout`, so the busy-wait’s `performance.now` stays real) show the deferred list updated immediately while the debounced list updates exactly at 300 ms, and that the debounced list commits once for a burst.',
  },
  {
    id: 'large-lists',
    title: 'Rendering large lists',
    section: 'built-in',
    category: CATEGORY,
    level: 'intermediate',
    summary:
      'What 5,000 rows cost, what memo() does and does not fix, and why virtualization is the real answer.',
    tags: ['virtualization', 'windowing', 'lists', 'tables', 'memo', 'profiling'],
    demo: `${P}/LargeListDemo.tsx`,
    sources: [`${P}/LargeListDemo.tsx`, `${P}/workload.ts`],
    tests: [`${P}/LargeListDemo.test.tsx`],
    minReact: '16.8',
    support: { level: 'universal' },
    officialDocs: [
      { label: 'TanStack Virtual', url: 'https://tanstack.com/virtual/latest' },
      {
        label: 'MDN: content-visibility',
        url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/content-visibility',
      },
    ],
    related: ['memo', 'profiler', 'use-deferred-value', 'index-as-key'],
    concept:
      'The demo renders up to 5,000 table rows and reports each commit’s duration with `<Profiler>`. `memo` rows make unrelated parent re-renders cheap; sorting or changing the row count still touches every row.',
    problem:
      'Rendering cost grows with the data, not with what the user can see. Mounting thousands of rows blocks the main thread and creates a huge DOM that is slow to lay out and scroll.',
    whenToUse: [
      'Virtualize (render only the rows in the viewport plus a small overscan) when lists reach the low thousands, or rows are complex.',
      'Pagination or “show more” when the UX allows — simpler than virtualization.',
      '`memo` rows with stable keys and props to keep unrelated re-renders cheap.',
    ],
    whenNotToUse: [
      'Virtualization for short lists — it complicates find-in-page, accessibility and variable-height rows.',
      'A hand-written virtualizer in production — use a maintained library (TanStack Virtual, react-window). This project deliberately adds no dependency for it.',
    ],
    edgeCases: [
      '`content-visibility: auto` lets the browser skip layout/paint for off-screen rows but does not reduce React’s render work.',
      'Toggling between `memo` and plain row components changes the element type, which remounts every row.',
    ],
    testing:
      'Tests count 5,000 and 500 rendered rows (with a CSS selector — role queries over 5,000 rows are too slow), check sorting, and read the Profiler commit counter.',
  },
  {
    id: 'profiler',
    title: '<Profiler>',
    section: 'built-in',
    category: CATEGORY,
    level: 'advanced',
    summary: 'Measure how often and how long a React subtree renders, programmatically.',
    tags: ['Profiler', 'onRender', 'actualDuration', 'baseDuration', 'measurement'],
    demo: `${P}/ProfilerDemo.tsx`,
    sources: [`${P}/ProfilerDemo.tsx`, 'components/ui/RenderCount.tsx'],
    tests: [`${P}/ProfilerDemo.test.tsx`],
    minReact: '16.9',
    support: {
      level: 'universal',
      notes:
        'Disabled in production builds unless you use the profiling build (`react-dom/profiling`).',
    },
    officialDocs: [
      { label: '<Profiler>', url: 'https://react.dev/reference/react/Profiler' },
      {
        label: 'React Performance tracks',
        url: 'https://react.dev/reference/dev-tools/react-performance-tracks',
      },
    ],
    related: ['large-lists', 'use-memo', 'memo'],
    concept:
      '`<Profiler id onRender>` calls `onRender(id, phase, actualDuration, baseDuration, startTime, commitTime)` every time the subtree commits. `actualDuration` is the render time of this commit; `baseDuration` estimates a full re-render without memoisation.',
    problem:
      'Guessing what is slow leads to memoising the wrong things. You need numbers for a specific subtree, and sometimes you need them in code (logging, CI budgets).',
    whenToUse: [
      'Comparing before/after a change, or checking that `memo` actually skips renders (the playground’s `RenderCount` is built on it).',
      'Reporting render timings from a profiling build to your monitoring.',
    ],
    whenNotToUse: [
      'Everyday investigation — the React DevTools Profiler and, since 19.2, React’s Performance panel tracks show more with no code.',
      'Wrapping the whole app in many Profilers — each adds overhead.',
    ],
    mistakes: [
      {
        title: 'Calling setState on an ancestor from onRender',
        wrong: '<Profiler id="list" onRender={(...args) => setSamples([...samples, args])}>',
        why: 'The state update re-renders the profiled subtree, which calls `onRender` again — an endless loop of commits.',
        right:
          'Push samples into a ref or external store that only a sibling report subscribes to (as the demo does).',
      },
    ],
    testing:
      'The test checks one mount sample per subtree, update samples only for the subtree that changed, and that clearing the report does not trigger new samples.',
  },
  {
    id: 'memoization-pitfalls',
    title: 'Memoization pitfalls & dependency mistakes',
    section: 'built-in',
    category: CATEGORY,
    level: 'intermediate',
    summary:
      'Object/array literals in deps and props silently break memoisation — and when memoisation was never needed.',
    tags: ['dependencies', 'object literal', 'memo', 'useMemo', 'useCallback', 'unnecessary'],
    demo: `${P}/MemoizationPitfallsDemo.tsx`,
    sources: [`${P}/MemoizationPitfallsDemo.tsx`],
    tests: [`${P}/MemoizationPitfallsDemo.test.tsx`],
    minReact: '16.8',
    support: { level: 'universal' },
    officialDocs: [
      {
        label: 'Should you add useMemo everywhere?',
        url: 'https://react.dev/reference/react/useMemo#should-you-add-usememo-everywhere',
      },
      {
        label: 'Removing Effect dependencies',
        url: 'https://react.dev/learn/removing-effect-dependencies',
      },
    ],
    related: [
      'use-memo',
      'use-callback',
      'memo',
      'overusing-memoization',
      'object-deps-infinite-loop',
      'react-compiler',
    ],
    concept:
      'React compares dependencies and memo props with `Object.is`. A `{ … }` or `[ … ]` written in the component body is a new value on every render, so a dependency list containing it always “changes”, and a `memo` child receiving it always re-renders.',
    problem:
      'Memoisation that never hits looks like optimisation but only adds cost — and effects that re-run on every render cause loops and repeated requests.',
    whenToUse: [
      'Depend on primitives (`[page]`), or create the object inside the effect.',
      'Hoist constants (styles, options) to module scope.',
      'Memoise an object only when something downstream compares its identity.',
    ],
    whenNotToUse: [
      'Cheap calculations, primitives, handlers for DOM elements, and children that are not `memo` — memoisation there is noise (see “Overusing memoization”).',
    ],
    mistakes: [
      {
        title: 'Object literal in a dependency list',
        wrong: 'useEffect(() => fetchPage({ page }), [{ page }]);',
        why: 'Runs after every render. `exhaustive-deps` flags literals written directly in the array, but not objects passed through a custom Hook’s parameters.',
        right: 'useEffect(() => fetchPage({ page }), [page]);',
      },
    ],
    edgeCases: [
      'Lint cannot see through custom Hook arguments: `useMyEffect(options)` with an inline `options` object re-runs silently. The demo’s counter Hook is built that way on purpose.',
    ],
    testing:
      'The test counts how often an effect with `[page]`, `[{ page }]` and a memoised object would run across unrelated renders and a real change, and checks that `memo` re-renders with an inline style object but not with a module constant.',
  },
  {
    id: 'react-compiler',
    title: 'React Compiler and manual memoization',
    section: 'built-in',
    category: CATEGORY,
    level: 'advanced',
    summary:
      'React Compiler 1.0 memoises components automatically; useMemo/useCallback become escape hatches. This project lints with its rules but does not compile with it.',
    tags: [
      'react compiler',
      'babel-plugin-react-compiler',
      'automatic memoization',
      'eslint',
      'use no memo',
    ],
    sources: [`${P}/UseCallbackDemo.tsx`, `${P}/UseMemoDemo.tsx`, `${P}/MemoDemo.tsx`],
    minReact: '17.0',
    support: {
      level: 'universal',
      notes:
        'Works best with React 19; React 17/18 need a `target` option and the `react-compiler-runtime` package.',
    },
    officialDocs: [
      REACT_COMPILER_DOCS,
      {
        label: 'React Compiler v1.0 announcement',
        url: 'https://react.dev/blog/2025/10/07/react-compiler-1',
      },
      { label: 'Installation', url: 'https://react.dev/learn/react-compiler/installation' },
    ],
    related: [
      'use-memo',
      'use-callback',
      'memo',
      'eslint-plugin-react-hooks',
      'memoization-pitfalls',
    ],
    concept:
      'React Compiler (`babel-plugin-react-compiler`, stable since 1.0 in October 2025) is a build-time tool that analyses components and Hooks and inserts memoisation automatically — often more precisely than hand-written `useMemo`/`useCallback`/`memo`, and even where Hooks cannot be called (after an early return).',
    problem:
      'Manual memoisation is easy to get wrong (missing deps, inline objects) and clutters code. The compiler removes most of the need — but only for code that follows the Rules of React.',
    whenToUse: [
      'New apps: the React team recommends enabling the compiler (Vite, Next.js and Expo templates offer it).',
      'With the compiler on, keep `useMemo`/`useCallback` as escape hatches where you need precise control — e.g. a memoised value used as an effect dependency.',
      'Existing code: leave existing memoisation in place (removing it can change compilation output) or remove it only with good test coverage.',
    ],
    whenNotToUse: [
      'Code that breaks the Rules of React (mutating props/state, reading refs during render): the compiler skips those components; fix them first — the lint rules point at them.',
      'Do not pin your expectations on exact memoisation: future compiler versions may memoise differently, which can make effects that rely on memoised identities fire more or less often. Pin an exact version without good end-to-end tests.',
    ],
    execution: [
      'Build time: the Babel plugin (it must run first in the pipeline) rewrites components and Hooks to cache JSX, values and callbacks per render based on their inputs.',
      'Runtime: nothing new to call; React DevTools shows a “Memo ✨” badge on compiled components.',
      '`"use no memo"` in a function opts it out temporarily while you debug.',
    ],
    edgeCases: [
      'This repository does **not** enable the compiler in `vite.config.ts`, so the manual `useMemo`/`useCallback`/`memo` demos stay observable — with the compiler on, the “without memoisation” variants would be memoised automatically.',
      'It **does** lint with the compiler-powered rules from `eslint-plugin-react-hooks` 7 (`recommended-latest`: `purity`, `refs`, `immutability`, `set-state-in-effect`, `preserve-manual-memoization`, …). The linter does not require the compiler to be installed.',
    ],
    production: [
      'Adopt incrementally (directories or gating), watch for Rules-of-React lint errors, and rely on end-to-end tests when upgrading the compiler.',
    ],
  },
];
