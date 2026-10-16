import type { CatalogEntry } from '../types';

const CATEGORY = 'Advanced patterns';

const USE_SYNC_EXTERNAL_STORE = {
  label: 'useSyncExternalStore',
  url: 'https://react.dev/reference/react/useSyncExternalStore',
};

export const entries: CatalogEntry[] = [
  {
    id: 'use-event-emitter',
    title: 'useEventEmitter',
    section: 'custom',
    category: CATEGORY,
    level: 'intermediate',
    summary:
      'Subscribe components to a shared, typed event bus built with a tiny `createEmitter<Events>()`.',
    tags: ['event emitter', 'pub/sub', 'event bus', 'mitt', 'typed events', 'decoupling'],
    demo: 'examples/custom-hooks/advanced/UseEventEmitterDemo.tsx',
    sources: ['hooks/advanced/useEventEmitter.ts', 'hooks/advanced/createEmitter.ts'],
    tests: [
      'hooks/advanced/useEventEmitter.test.tsx',
      'examples/custom-hooks/advanced/AdvancedDemos.test.tsx',
    ],
    minReact: '16.8',
    support: {
      level: 'universal',
      notes: 'Subscriptions start after mount, so nothing runs on the server.',
    },
    officialDocs: [
      {
        label: 'Connecting to an external system',
        url: 'https://react.dev/learn/synchronizing-with-effects',
      },
    ],
    related: ['use-latest', 'use-external-store', 'use-event-listener'],
    concept:
      '`createEmitter<{ toast: { text: string }; logout: void }>()` returns `on`/`off`/`emit`/`listenerCount`/`clear` with payloads typed per event. `useEventEmitter(emitter, type, handler)` subscribes in an effect and unsubscribes on unmount, always calling the latest handler.',
    problem:
      'Distant components sometimes need to react to *moments* (“item added”, “session expired”) without lifting state or threading callbacks. Ad-hoc `window` CustomEvents are untyped and easy to leak.',
    whenToUse: [
      'Fire-and-forget notifications between unrelated components: toasts, analytics, “refresh now” signals.',
      'Bridging non-React code (a WebSocket client, a service) to components.',
    ],
    whenNotToUse: [
      'State that late subscribers must read — events are not replayed; use a store (`useExternalStore`) or context.',
      'Parent/child communication — pass props and callbacks; an event bus hides the data flow.',
      'Cross-tab messages — use `BroadcastChannel` (see useBroadcastChannel).',
    ],
    api: {
      signature:
        'function useEventEmitter<Events extends EmitterEventMap, K extends keyof Events & string>(emitter: Emitter<Events> | null, type: K, handler: (payload: Events[K]) => void): void',
      params: [
        {
          name: 'emitter',
          type: 'Emitter<Events> | null',
          description:
            'A stable emitter (module level or context). `null` pauses the subscription.',
        },
        { name: 'type', type: 'K', description: 'Event name; changing it re-subscribes.' },
        {
          name: 'handler',
          type: '(payload: Events[K]) => void',
          description: 'Typed from the event map. May change every render without re-subscribing.',
        },
      ],
      returns:
        'Nothing. Emit with `emitter.emit(type, payload)` (no payload argument for `void` events).',
    },
    execution: [
      'Render: the latest handler is stored by `useLatest`.',
      'Effect: `emitter.on(type, payload => handlerRef.current(payload))`; the returned unsubscribe is the cleanup.',
      '`emit`: iterates over a copy of the handlers, so (un)subscribing during an emit is safe; if handlers throw, the rest still run and the error (or an `AggregateError`) is re-thrown afterwards.',
    ],
    mistakes: [
      {
        title: 'Creating the emitter inside the component',
        wrong:
          'function Page() {\n  const bus = createEmitter<Events>();\n  useEventEmitter(bus, "toast", show);\n}',
        why: 'A new emitter every render: subscribers re-subscribe constantly and publishers emit on a different instance than listeners.',
        right:
          'const bus = createEmitter<Events>(); // module level, or useState(() => createEmitter())',
      },
    ],
    edgeCases: [
      'Adding the same function twice registers it once (handlers are kept in a `Set`).',
      'Events emitted while a subscriber is unmounted are simply not seen by it.',
    ],
    testing:
      'Unit tests cover typed payloads, `void` events, unsubscribe/off/clear, mutation during emit, error aggregation, destructured methods, latest-handler semantics and cleanup on unmount.',
  },
  {
    id: 'use-subscription',
    title: 'useSubscription',
    section: 'custom',
    category: CATEGORY,
    level: 'advanced',
    summary:
      'Read any `{ subscribe, getCurrentValue }` source safely — a thin layer over `useSyncExternalStore` with snapshot caching.',
    tags: [
      'useSyncExternalStore',
      'subscription',
      'external source',
      'snapshot',
      'tearing',
      'use-subscription',
    ],
    demo: 'examples/custom-hooks/advanced/UseSubscriptionDemo.tsx',
    sources: ['hooks/advanced/useSubscription.ts'],
    tests: [
      'hooks/advanced/useSubscription.test.tsx',
      'hooks/advanced/advanced.ssr.test.tsx',
      'examples/custom-hooks/advanced/AdvancedDemos.test.tsx',
    ],
    minReact: '18.0',
    support: {
      level: 'universal',
      notes: 'Uses `getServerValue` (or `getCurrentValue`) for the server render and hydration.',
    },
    officialDocs: [
      USE_SYNC_EXTERNAL_STORE,
      {
        label: 'React 18 WG: useMutableSource → useSyncExternalStore',
        url: 'https://github.com/reactwg/react-18/discussions/86',
      },
    ],
    related: ['use-sync-external-store', 'use-external-store', 'use-observable'],
    concept:
      'Takes a source object `{ subscribe(onChange) → unsubscribe, getCurrentValue(), getServerValue? }` and returns its current value via `useSyncExternalStore`, keeping the previous reference while `isEqual(previous, next)` holds.',
    problem:
      '`useSyncExternalStore` requires `getSnapshot` to return a cached value: a source that builds a new object per call causes “The result of getSnapshot should be cached” and an infinite loop. Sources also often come as objects or class instances, not loose functions.',
    whenToUse: [
      'Wrapping browser or library sources that are not React-aware: selection, a third-party SDK, a class-based model.',
      'Sources whose `getCurrentValue` returns fresh objects — pass `isEqual`.',
    ],
    whenNotToUse: [
      'Sources that already return stable values from stable functions — call `useSyncExternalStore` directly; this hook would only rename it.',
      'Push-only streams without a current value (RxJS `Subject`) — use `useObservable`.',
      'Selecting slices from a store — use `useExternalStore(store, selector)`.',
    ],
    api: {
      signature:
        'function useSubscription<T>(source: SubscriptionSource<T>, options?: { isEqual?: (previous: T, next: T) => boolean }): T',
      params: [
        {
          name: 'source',
          type: '{ subscribe, getCurrentValue, getServerValue? }',
          description: 'Keep it stable (module level / `useMemo`): a new object re-subscribes.',
        },
        {
          name: 'options.isEqual',
          type: '(previous, next) => boolean',
          description: 'Snapshot equality. Default `Object.is`. Keep it stable.',
          optional: true,
        },
      ],
      returns: 'The current value.',
    },
    execution: [
      'Render: `getSnapshot` (memoised per source/isEqual) calls `getCurrentValue()` and returns the cached value when equal.',
      'Commit: React subscribes via `source.subscribe`; methods are called through `source`, so class instances keep `this`.',
      'Change: React re-reads the snapshot and re-renders only if it differs by `Object.is`.',
      'Unmount or new source: the unsubscribe function runs.',
    ],
    mistakes: [
      {
        title: 'Returning a fresh object from the snapshot',
        wrong: 'useSyncExternalStore(store.subscribe, () => ({ ...store.get() }));',
        why: 'Every call returns a different object, so React thinks the store changed on every check and re-renders forever.',
        right: 'useSubscription(source, { isEqual: shallowEqualObjects });',
      },
    ],
    edgeCases: [
      'Without `getServerValue`, the server calls `getCurrentValue` — provide it when that touches browser APIs.',
    ],
    testing:
      'Tests cover change notifications, a single subscription for a stable source, switching sources, `isEqual` preventing renders for fresh objects, and class-based sources.',
  },
  {
    id: 'use-external-store',
    title: 'useExternalStore',
    section: 'custom',
    category: CATEGORY,
    level: 'advanced',
    summary:
      'A teaching version of Zustand’s core: `createStore()` + a selector hook that skips renders when the selected slice is unchanged.',
    tags: [
      'store',
      'zustand',
      'selector',
      'useSyncExternalStore',
      're-renders',
      'shallow equality',
    ],
    demo: 'examples/custom-hooks/advanced/UseExternalStoreDemo.tsx',
    sources: ['hooks/advanced/useExternalStore.ts', 'hooks/advanced/createStore.ts'],
    tests: [
      'hooks/advanced/useExternalStore.test.tsx',
      'hooks/advanced/advanced.ssr.test.tsx',
      'examples/custom-hooks/advanced/AdvancedDemos.test.tsx',
    ],
    minReact: '18.0',
    support: {
      level: 'universal',
      notes:
        'The server renders the store’s current state; create stores per request if they hold user data.',
    },
    officialDocs: [
      USE_SYNC_EXTERNAL_STORE,
      {
        label: 'Zustand: vanilla createStore',
        url: 'https://zustand.docs.pmnd.rs/reference/apis/create-store',
      },
    ],
    related: ['zustand', 'use-sync-external-store', 'use-context-performance', 'use-subscription'],
    concept:
      '`createStore(initial | (set, get) => state)` keeps state outside React with `getState`, `setState(patch | updater, replace?)` and `subscribe`. `useExternalStore(store, selector, equalityFn)` subscribes a component to `selector(state)` only.',
    problem:
      'A single context value re-renders every consumer on any change. Selector subscriptions let each component re-render only when *its* slice changes, without memo gymnastics.',
    whenToUse: [
      'App-wide client state read by many components that each need a small slice.',
      'State that must be read/written outside React (WebSocket handlers, tests, devtools).',
      'Learning how Zustand, Redux’s `useSelector` and similar libraries work.',
    ],
    whenNotToUse: [
      'Production apps with middleware, devtools, persistence or SSR hydration needs — use Zustand, Redux Toolkit or Jotai.',
      'Server data — use TanStack Query or SWR.',
      'State used by one component — `useState`/`useReducer` is simpler.',
    ],
    api: {
      signature:
        'function useExternalStore<T extends object, U = T>(store: ExternalStore<T>, selector?: (state: T) => U, equalityFn?: (previous: U, next: U) => boolean): U',
      params: [
        { name: 'store', type: 'ExternalStore<T>', description: 'From `createStore`. Stable.' },
        {
          name: 'selector',
          type: '(state: T) => U',
          description: 'Picks the slice. Default: the whole state. Inline selectors are fine.',
          optional: true,
        },
        {
          name: 'equalityFn',
          type: '(previous: U, next: U) => boolean',
          description:
            'Default `Object.is`. Use `shallowEqualObjects` for selectors that build objects/arrays.',
          optional: true,
        },
      ],
      returns: 'The selected slice.',
    },
    execution: [
      '`setState` merges the patch into a *new* state object and calls every listener synchronously (`Object.is`-equal results are skipped).',
      '`getSnapshot` memoises `(state, selection)`: same state → same selection; new state but `equalityFn` equal → the previous reference.',
      '`useSyncExternalStore` compares that reference with `Object.is`; unchanged → no render.',
      'Unmount: the store listener is removed.',
    ],
    mistakes: [
      {
        title: 'Selecting a new object without an equality function',
        wrong: 'const { a, b } = useExternalStore(store, (s) => ({ a: s.a, b: s.b }));',
        why: 'The selector returns a new object for every state change, so the component re-renders even when `a` and `b` did not change.',
        right:
          'const { a, b } = useExternalStore(store, (s) => ({ a: s.a, b: s.b }), shallowEqualObjects);',
      },
      {
        title: 'Mutating state in place',
        wrong: 'store.getState().todos.push(todo);',
        why: 'The state reference does not change, so no listener runs and selectors keep returning the cached value.',
        right: 'store.setState((s) => ({ todos: [...s.todos, todo] }));',
      },
    ],
    edgeCases: [
      'Listeners added during a `setState` run start on the next update (the listener set is copied).',
      '`setState(next, true)` replaces the state instead of merging.',
    ],
    testing:
      'A render-count test wraps two components in `<Profiler>` and proves that updating one slice commits only its subscriber; other tests cover equality functions, initializer actions and unsubscribe on unmount.',
    production: [
      'Define selectors at module level when they are reused; keep store modules free of React imports.',
    ],
    diagram: {
      title: 'Why unrelated updates do not re-render',
      description: 'The selector result is compared before React schedules a render.',
      mermaid: `sequenceDiagram
  participant A as Action
  participant S as Store
  participant H as useExternalStore
  participant R as React
  A->>S: setState name Grace
  S->>H: listener called
  H->>R: onStoreChange
  R->>H: getSnapshot
  H->>H: selector picks count, still 0
  H-->>R: same reference as before
  Note over R: Object.is equal, render skipped`,
    },
  },
  {
    id: 'use-observable',
    title: 'useObservable',
    section: 'custom',
    category: CATEGORY,
    level: 'advanced',
    summary:
      'Render the latest value of any `subscribe(observer)` source — RxJS Observables, Subjects, BehaviorSubjects — without importing RxJS.',
    tags: ['rxjs', 'observable', 'BehaviorSubject', 'streams', 'reactive', 'subscription'],
    demo: 'examples/custom-hooks/advanced/UseObservableDemo.tsx',
    sources: ['hooks/advanced/useObservable.ts'],
    tests: [
      'hooks/advanced/useObservable.test.tsx',
      'hooks/advanced/advanced.ssr.test.tsx',
      'examples/custom-hooks/advanced/AdvancedDemos.test.tsx',
    ],
    minReact: '16.8',
    support: {
      level: 'universal',
      notes: 'Renders `initialValue` on the server; subscribes after hydration.',
    },
    officialDocs: [
      { label: 'RxJS: Observable', url: 'https://rxjs.dev/guide/observable' },
      { label: 'RxJS: BehaviorSubject', url: 'https://rxjs.dev/api/index/class/BehaviorSubject' },
    ],
    related: ['rxjs-observable-store', 'use-subscription', 'use-external-store'],
    concept:
      'Subscribes with `{ next, error, complete }` in a layout effect, stores the latest value, and returns `{ value, status: "waiting" | "active" | "error" | "complete", error }`. Unsubscribes on unmount or when the observable changes.',
    problem:
      'Observables are push-only: there is no synchronous “current value” for `useSyncExternalStore`, and manual `subscribe` effects often forget to unsubscribe, ignore errors, or show stale values from the previous stream.',
    whenToUse: [
      'Consuming RxJS pipelines (debounced input, WebSocket streams, polling) in components.',
      'Integrating libraries that expose TC39-style observables.',
    ],
    whenNotToUse: [
      'Sources with a synchronous getter (stores) — use `useSubscription`/`useExternalStore`, which are tear-free.',
      'Server data fetching — use TanStack Query.',
      'Just for debouncing in React — `useDeferredValue` or a debounce hook is simpler.',
    ],
    api: {
      signature:
        'function useObservable<T>(observable: ObservableLike<T> | null, initialValue: T): { value: T; status: ObservableStatus; error: Error | null }',
      params: [
        {
          name: 'observable',
          type: '{ subscribe(observer): { unsubscribe(): void } } | null',
          description: 'Keep it stable (`useMemo`/module level). `null` = no subscription.',
        },
        {
          name: 'initialValue',
          type: 'T',
          description:
            'Shown until the first emission and on the server. Changing it does not re-subscribe.',
        },
      ],
      returns: 'Latest value, status and error.',
    },
    execution: [
      'Render: if the stored state belongs to a different observable, `initialValue`/`waiting` is returned (no stale values).',
      'Layout effect: subscribe; synchronous emissions (BehaviorSubject, `of()`) update state before paint.',
      '`next` → value/active; `error` → error status (keeps last value); `complete` → complete status.',
      'Cleanup: `unsubscribe()` and ignore late notifications.',
    ],
    mistakes: [
      {
        title: 'Building the pipeline during render',
        wrong: 'const { value } = useObservable(input$.pipe(debounceTime(300)), "");',
        why: '`pipe()` returns a new observable every render, so the hook unsubscribes and resubscribes each time; with synchronous sources (`of(...)`) this becomes an infinite render loop.',
        right:
          'const debounced$ = useMemo(() => input$.pipe(debounceTime(300)), [input$]);\nconst { value } = useObservable(debounced$, "");',
      },
    ],
    edgeCases: [
      'Cold observables restart their work on every subscription (including the Strict Mode remount in development).',
      'An observable that errored is finished; pass a new one (e.g. with `retry`) to recover.',
    ],
    testing:
      'Tests use real RxJS 7 (`BehaviorSubject`, `Subject`, `interval` with fake timers, `of`, `throwError`) and check `subject.observed` to prove unsubscription; a minimal non-RxJS observable shows the structural contract.',
  },
  {
    id: 'use-state-machine',
    title: 'useStateMachine',
    section: 'custom',
    category: CATEGORY,
    level: 'advanced',
    summary:
      'Typed finite state machine on `useReducer`: states, discriminated-union events, guards, context and entry effects with cleanup.',
    tags: [
      'state machine',
      'fsm',
      'statechart',
      'xstate',
      'guards',
      'discriminated union',
      'useReducer',
    ],
    demo: 'examples/custom-hooks/advanced/UseStateMachineDemo.tsx',
    sources: ['hooks/advanced/useStateMachine.ts'],
    tests: [
      'hooks/advanced/useStateMachine.test.tsx',
      'hooks/advanced/advanced.ssr.test.tsx',
      'examples/custom-hooks/advanced/AdvancedNetworkDemos.test.tsx',
    ],
    minReact: '19.2',
    support: { level: 'universal' },
    officialDocs: [
      {
        label: 'useReducer',
        url: 'https://react.dev/reference/react/useReducer',
      },
      {
        label: 'useEffectEvent',
        url: 'https://react.dev/reference/react/useEffectEvent',
      },
      { label: 'XState documentation', url: 'https://stately.ai/docs' },
    ],
    related: ['use-reducer', 'use-effect-event', 'use-optimistic-mutation'],
    concept:
      'A config lists, per state, which events it accepts (`on`) and where they lead — a target, an object with `guard`/`assign`, or candidates tried in order. A pure `machineTransition` function runs in the reducer; `entry` actions run in an effect when a state is entered and may return a cleanup.',
    problem:
      'Boolean soup (`isLoading && !isError && hasData`) allows impossible combinations and makes it easy to, say, accept a late `RESOLVE` after the user cancelled. A machine makes illegal transitions unrepresentable and ties side effects to states.',
    whenToUse: [
      'Multi-step UI flows: wizards, checkout, media players, upload/retry logic.',
      'Async lifecycles where cancellation and retries must be correct.',
    ],
    whenNotToUse: [
      'Two or three independent booleans — `useState` is clearer.',
      'Hierarchical/parallel states, delayed transitions, actors, history or visual tooling — use XState (with `@xstate/react`), which also handles persistence and inspection.',
    ],
    api: {
      signature:
        'function useStateMachine<S extends string, C, E extends { type: string }>(config: MachineConfig<S, C, E>): { value: S; context: C; send(event: E): void; can(event: E): boolean; matches(state: S): boolean }',
      params: [
        {
          name: 'config.initial / context',
          type: 'S / C',
          description: 'Initial state name and extended state (read once).',
        },
        {
          name: 'config.states[s].on[type]',
          type: 'S | { target?, guard?, assign? } | Array<…>',
          description:
            'Transitions; the event is narrowed per type. No `target` = context-only update.',
        },
        {
          name: 'config.states[s].entry',
          type: '({ state, context, event, send }) => void | (() => void)',
          description: 'Effect on entering the state; cleanup runs on exit/unmount.',
          optional: true,
        },
      ],
      returns: 'Current state, context, a stable `send`, and `can`/`matches` helpers.',
    },
    execution: [
      '`send(event)` dispatches to `useReducer`; `machineTransition` finds the handler for the current state and tries candidates in order.',
      'Rejected events return the same snapshot, so React bails out of rendering.',
      'Commit: if the state was entered (`value` or `version` changed), the previous entry cleanup runs, then the new `entry` (via `useEffectEvent`, so it sees fresh context).',
    ],
    mistakes: [
      {
        title: 'Side effects in guards or assign',
        wrong: "assign: (ctx) => { fetch('/api/save'); return ctx; }",
        why: 'They run inside the reducer, which React may call twice (Strict Mode) or replay. Put side effects in `entry`.',
      },
    ],
    edgeCases: [
      'A transition with an explicit `target` equal to the current state re-enters it (entry runs again).',
      'Strict Mode runs entry effects twice on mount in development; cleanups must undo them (e.g. abort the request).',
    ],
    testing:
      'The pure `machineTransition` is unit-tested directly; hook tests cover ignored events, guard fallbacks, `can()`, entry/cleanup ordering, timers sending events, and cleanup on unmount. The demo test drives a real retry flow against the MSW `/api/flaky` endpoint.',
    diagram: {
      title: 'The demo machine',
      description: 'Fetch with cancel, guarded retries and reset.',
      mermaid: `stateDiagram-v2
  [*] --> idle
  idle --> loading: FETCH
  loading --> success: RESOLVE
  loading --> failure: REJECT
  loading --> idle: CANCEL
  failure --> loading: RETRY if attempts below 3
  failure --> idle: RESET
  success --> idle: RESET`,
    },
  },
  {
    id: 'use-feature-flag',
    title: 'useFeatureFlag / useFeatureFlags',
    section: 'custom',
    category: CATEGORY,
    level: 'intermediate',
    summary:
      'Typed feature flags from a provider, with an optional remote source and per-browser overrides in localStorage.',
    tags: [
      'feature flags',
      'feature toggles',
      'remote config',
      'overrides',
      'context',
      'localStorage',
    ],
    demo: 'examples/custom-hooks/advanced/UseFeatureFlagDemo.tsx',
    sources: [
      'hooks/advanced/useFeatureFlag.ts',
      'hooks/advanced/FeatureFlagProvider.tsx',
      'hooks/advanced/featureFlags.ts',
      'mocks/extra/advancedFeatureFlags.ts',
    ],
    tests: [
      'hooks/advanced/useFeatureFlag.test.tsx',
      'hooks/advanced/advanced.ssr.test.tsx',
      'examples/custom-hooks/advanced/AdvancedNetworkDemos.test.tsx',
    ],
    minReact: '19.0',
    support: {
      level: 'universal',
      notes: 'Server and first client render use the defaults; remote values arrive after mount.',
    },
    officialDocs: [
      { label: 'useContext', url: 'https://react.dev/reference/react/useContext' },
      {
        label: 'OpenFeature (vendor-neutral flag SDKs)',
        url: 'https://openfeature.dev/docs/reference/intro',
      },
    ],
    related: ['use-local-storage', 'use-context-performance'],
    concept:
      '`defineFeatureFlags({ newCheckout: false, searchMode: "exact" })` declares names, types and defaults once. `<FeatureFlagProvider definition load>` resolves each flag as override → remote → default; `useFeatureFlag(def, name)` returns one typed value and `useFeatureFlags(def)` exposes sources, status and override controls.',
    problem:
      'String-keyed flag lookups (`flags["newChekout"]`) fail silently, remote payloads are trusted blindly, and QA has no way to flip a flag locally without redeploying.',
    whenToUse: [
      'Gradual rollouts and kill switches with a small, typed flag set.',
      'Letting developers/QA override flags in their own browser.',
    ],
    whenNotToUse: [
      'Percentage rollouts, targeting rules, experiments and audit logs — use a flag service (LaunchDarkly, Unleash, Flagsmith, GrowthBook) via OpenFeature.',
      'Security or entitlement checks — flags live in the client and can be overridden; enforce on the server.',
    ],
    api: {
      signature:
        'function useFeatureFlag<F extends FlagValues, K extends keyof F & string>(definition: FeatureFlagDefinition<F>, name: K): F[K]',
      params: [
        {
          name: 'definition',
          type: 'FeatureFlagDefinition<F>',
          description: 'From `defineFeatureFlags(defaults, { storageKey })` at module level.',
        },
        { name: 'name', type: 'K', description: 'A declared flag name (checked at compile time).' },
        {
          name: '<FeatureFlagProvider load>',
          type: '(signal: AbortSignal) => Promise<unknown>',
          description:
            'Optional remote source; unknown names and wrongly-typed values are dropped. Aborted on unmount.',
          optional: true,
        },
      ],
      returns:
        '`useFeatureFlag`: the effective value (defaults outside a provider). `useFeatureFlags`: `{ flags, defaults, remote, overrides, sourceOf, status, error, setOverride, clearOverride, clearOverrides, refresh }` (throws outside a provider).',
    },
    execution: [
      'Render: overrides come from `useLocalStorage` (validated against the defaults); the context value is memoised.',
      'Effect: `load(signal)` runs once per `load` identity or `refresh()`; results are filtered by `pickKnownFlags`.',
      'Failure: `status: "error"`; the last good remote values and defaults stay in effect.',
      'Unmount: the request is aborted.',
    ],
    edgeCases: [
      'Overrides sync across tabs (via the localStorage hook) and survive reloads.',
      'Tampered localStorage values with the wrong type are ignored, not rendered.',
      'A new `load` function on every render reloads every render — memoise it.',
    ],
    testing:
      'Tests use the MSW `/api/feature-flags` endpoint (including a 503 override), check precedence and `sourceOf`, localStorage persistence, tampered storage, abort on unmount, `refresh()` and the compile-time flag types (`expectTypeOf`).',
    production: [
      'Remove flags once a rollout is complete — dead flags are technical debt.',
      'Consider hiding override controls (`allowOverrides={false}`) for end users.',
    ],
  },
  {
    id: 'use-permission',
    title: 'usePermission',
    section: 'custom',
    category: CATEGORY,
    level: 'intermediate',
    summary:
      'Live permission state (`granted`/`denied`/`prompt`) from `navigator.permissions.query()` — never prompts.',
    tags: [
      'permissions api',
      'navigator.permissions',
      'geolocation',
      'notifications',
      'camera',
      'privacy',
    ],
    demo: 'examples/custom-hooks/advanced/UsePermissionDemo.tsx',
    sources: ['hooks/advanced/usePermission.ts'],
    tests: [
      'hooks/advanced/usePermission.test.tsx',
      'hooks/advanced/advanced.ssr.test.tsx',
      'examples/custom-hooks/advanced/AdvancedDemos.test.tsx',
    ],
    minReact: '18.0',
    support: {
      level: 'browser-limited',
      notes:
        'The API exists in all modern browsers, but supported permission names differ (Chromium accepts the most). Unknown names reject with a `TypeError` → `status: "error"`.',
    },
    officialDocs: [
      {
        label: 'MDN: Permissions API',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Permissions_API',
      },
      {
        label: 'MDN: Permissions.query()',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Permissions/query',
      },
    ],
    related: ['use-geolocation', 'use-speech-recognition'],
    concept:
      'Queries the permission after mount, listens to the returned `PermissionStatus` `change` event, and returns `{ isSupported, status, state, error }`.',
    problem:
      'Apps prompt blindly, then cannot explain a previous denial. Knowing the state up front lets you show “enable location in settings” instead of a dead button, and react when the user changes it.',
    whenToUse: [
      'Adapting UI before asking: hide a “use my location” button when denied, show an explanation when `prompt`.',
      'Reacting to permission changes made in browser settings.',
    ],
    whenNotToUse: [
      'Requesting a permission — call the feature API (`getUserMedia`, `Notification.requestPermission()`, `getCurrentPosition`) from a user action.',
      'As the only gate — when the name is unsupported, just try the feature and handle its error.',
    ],
    api: {
      signature: 'function usePermission(name: PermissionName | (string & {})): PermissionResult',
      params: [
        {
          name: 'name',
          type: 'PermissionQueryName',
          description:
            'E.g. `geolocation`, `notifications`, `camera`, `microphone`, `clipboard-read`.',
        },
      ],
      returns:
        '`{ isSupported, status: "unsupported" | "pending" | "error" | "granted" | "denied" | "prompt", state: PermissionState | null, error }`.',
    },
    execution: [
      'Effect: `navigator.permissions.query({ name })`; a `cancelled` flag ignores late results.',
      'Resolved: subscribe to `change` and store the state tagged with its name.',
      'Render: results for a previous `name` are never shown (`pending` until the new query resolves).',
      'Cleanup: remove the `change` listener.',
    ],
    edgeCases: ['`denied` can mean “blocked by policy” as well as “user said no”.'],
    testing:
      'A fake `navigator.permissions` returns `EventTarget`-based statuses; tests cover unsupported, change events, rejected names and listener removal when the name changes and on unmount. The demo test asserts no prompt happens on mount.',
  },
  {
    id: 'use-optimistic-mutation',
    title: 'useOptimisticMutation',
    section: 'custom',
    category: CATEGORY,
    level: 'advanced',
    summary:
      'Optimistic updates with automatic, concurrency-safe rollback for state you own outside Actions.',
    tags: ['optimistic ui', 'rollback', 'mutation', 'useOptimistic', 'tanstack query', 'onMutate'],
    demo: 'examples/custom-hooks/advanced/UseOptimisticMutationDemo.tsx',
    sources: ['hooks/advanced/useOptimisticMutation.ts'],
    tests: [
      'hooks/advanced/useOptimisticMutation.test.tsx',
      'examples/custom-hooks/advanced/AdvancedNetworkDemos.test.tsx',
    ],
    minReact: '16.8',
    support: { level: 'universal' },
    officialDocs: [
      { label: 'useOptimistic', url: 'https://react.dev/reference/react/useOptimistic' },
      {
        label: 'TanStack Query: Optimistic updates',
        url: 'https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates',
      },
    ],
    related: ['tanstack-query', 'use-state-machine', 'use-reducer'],
    concept:
      'Keeps the confirmed state plus a queue of pending mutations. What you render is `pending.reduce(applyOptimistic, confirmed)`. Success folds the server result into `confirmed`; failure just drops that pending entry.',
    problem:
      'The common “snapshot before, restore on error” rollback is wrong under concurrency: if request A fails after request B was applied, restoring A’s snapshot also erases B. Deriving the view from confirmed state + pending queue rolls back only what failed.',
    whenToUse: [
      'Instant feedback for toggles, likes, reorders and renames in local/component state.',
      'Mutations triggered outside a form or transition (keyboard shortcuts, drag-and-drop, sockets) where `useOptimistic` does not apply.',
    ],
    whenNotToUse: [
      'Mutations that run inside an Action (`<form action>`, `startTransition`) — React’s `useOptimistic` does the same rebase internally and resets when the Action ends.',
      'Server-cache data — TanStack Query’s `onMutate`/`onError`/`onSettled` + `invalidateQueries` (or its `variables`-based optimistic UI) also refetches and dedupes.',
      'Irreversible actions (payments, sending email) — wait for confirmation.',
    ],
    api: {
      signature:
        'function useOptimisticMutation<TState, TVariables, TResult>(options: { initialState; mutationFn(variables, signal): Promise<TResult>; applyOptimistic(state, variables): TState; applyResult?(state, result, variables): TState; onSuccess?; onError? }): OptimisticMutation<TState, TVariables, TResult>',
      params: [
        {
          name: 'mutationFn',
          type: '(variables, signal) => Promise<TResult>',
          description: 'Reject to roll back. `signal` aborts on unmount.',
        },
        {
          name: 'applyOptimistic',
          type: '(state, variables) => TState',
          description: 'Pure; replayed on every render for each pending mutation.',
        },
        {
          name: 'applyResult',
          type: '(state, result, variables) => TState',
          description:
            'Pure; folds the server answer into confirmed state. Default: `applyOptimistic`.',
          optional: true,
        },
      ],
      returns:
        '`{ state, confirmedState, pending, isPending, error, mutate(variables) → Promise<{ ok, result | error }>, setConfirmed, dismissError }`. `mutate` never rejects.',
    },
    execution: [
      '`mutate`: dispatch `start` (pending += entry) → render shows the optimistic state immediately.',
      'Resolve: dispatch `success` → `confirmed = applyResult(confirmed, result)`, entry removed.',
      'Reject: dispatch `failure` → entry removed (rollback), `error` set, `onError` called.',
      'Unmount: in-flight requests are aborted and no state is updated.',
    ],
    mistakes: [
      {
        title: 'Snapshot rollback with concurrent requests',
        wrong:
          'const previous = items;\nsetItems(optimistic);\ntry { await save(); } catch { setItems(previous); }',
        why: '`previous` was captured before other in-flight changes; restoring it silently reverts them too.',
        right:
          'const m = useOptimisticMutation({ initialState: items, mutationFn: save, applyOptimistic });',
      },
    ],
    edgeCases: [
      'Out-of-order responses are handled: each success applies to the confirmed state and the remaining pending entries are replayed on top.',
      '`setConfirmed` (e.g. after a refetch) keeps pending entries applied on top of the new data.',
    ],
    testing:
      'Deferred promises let tests resolve and reject requests in any order: concurrent rollback, out-of-order completion, never-rejecting `mutate`, `setConfirmed`, and abort on unmount. The demo test hits the MSW `PATCH /api/todos/:id` endpoint with and without the `x-fail` header.',
  },
  {
    id: 'use-web-worker',
    title: 'useWebWorker',
    section: 'custom',
    category: CATEGORY,
    level: 'advanced',
    summary:
      'Typed messages to a lazily spawned Web Worker, terminated on unmount — demoed by counting primes off the main thread.',
    tags: ['web worker', 'worker', 'postMessage', 'off main thread', 'performance', 'vite'],
    demo: 'examples/custom-hooks/advanced/UseWebWorkerDemo.tsx',
    sources: [
      'hooks/advanced/useWebWorker.ts',
      'examples/custom-hooks/advanced/primes.worker.ts',
      'examples/custom-hooks/advanced/primes.ts',
    ],
    tests: [
      'hooks/advanced/useWebWorker.test.tsx',
      'hooks/advanced/advanced.ssr.test.tsx',
      'examples/custom-hooks/advanced/UseWebWorkerDemo.test.tsx',
    ],
    minReact: '16.8',
    support: {
      level: 'client-only',
      notes:
        'Workers exist in every modern browser; `isSupported` is `false` on the server and in jsdom.',
    },
    officialDocs: [
      {
        label: 'MDN: Using Web Workers',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers',
      },
      { label: 'Vite: Web Workers', url: 'https://vite.dev/guide/features.html#web-workers' },
    ],
    related: ['use-performance-measure', 'use-latest'],
    concept:
      '`useWebWorker<TIn, TOut>(source, { onMessage, onError })` spawns the worker on the first `postMessage`, exposes `lastMessage`, `error`, `isRunning` and `terminate()`, and terminates the worker on unmount or when a URL source changes.',
    problem:
      'Heavy synchronous work (parsing, image processing, search indexing) blocks rendering and input. Hand-rolled worker effects leak workers, spawn two in Strict Mode, and process replies after termination.',
    whenToUse: [
      'CPU-bound work longer than ~50 ms that would otherwise cause jank.',
      'Work that can be expressed as messages in and out (structured-clone friendly data).',
    ],
    whenNotToUse: [
      'I/O (fetch, IndexedDB) — it is already asynchronous.',
      'Tiny tasks — message passing and cloning cost more than the work.',
      'Request/response RPC with many methods — consider Comlink on top of a worker.',
    ],
    api: {
      signature:
        'function useWebWorker<TIn, TOut>(source: string | URL | (() => Worker), options?: { workerOptions?: WorkerOptions; onMessage?: (data: TOut) => void; onError?: (error: Error) => void }): WebWorkerControls<TIn, TOut>',
      params: [
        {
          name: 'source',
          type: 'string | URL | (() => Worker)',
          description:
            'With Vite use a factory: `() => new Worker(new URL("./x.worker.ts", import.meta.url), { type: "module" })`. Factory identity is ignored.',
        },
        {
          name: 'options.onMessage / onError',
          type: 'callbacks',
          description: 'Always the latest callbacks; no re-spawn when they change.',
          optional: true,
        },
      ],
      returns:
        '`{ isSupported, isRunning, lastMessage, error, postMessage(message, transfer?): boolean, terminate() }`.',
    },
    execution: [
      'Mount: nothing is spawned (Strict Mode safe).',
      '`postMessage`: spawn if needed (errors from the constructor → `error`), attach message/error listeners, post.',
      'Replies from a worker that is no longer current are ignored.',
      'Unmount or URL change: `terminate()`.',
    ],
    mistakes: [
      {
        title: 'Hiding the worker URL from the bundler',
        wrong: "const url = './primes.worker.ts';\nnew Worker(new URL(url, import.meta.url));",
        why: 'Vite only detects `new Worker(new URL("<literal>", import.meta.url))`; with a variable the worker file is not bundled and fails to load in production.',
        right:
          "useWebWorker(() => new Worker(new URL('./primes.worker.ts', import.meta.url), { type: 'module' }));",
      },
    ],
    edgeCases: [
      'Uncaught exceptions inside the worker surface as `error` but do not stop the worker.',
      '`DataCloneError` (functions, DOM nodes in the message) is caught and reported; `postMessage` returns `false`.',
    ],
    testing:
      'A `FakeWorker` class is stubbed with `vi.stubGlobal`; tests cover lazy spawn, typed replies, factory identity, worker errors, constructor failures, terminate + respawn, and termination on unmount/URL change. The demo test runs the real `handlePrimesRequest` behind a fake worker and asserts the URL points at `primes.worker.ts`.',
  },
  {
    id: 'use-performance-measure',
    title: 'usePerformanceMeasure',
    section: 'custom',
    category: CATEGORY,
    level: 'intermediate',
    summary:
      'Time async work with User Timing marks/measures and collect results via `PerformanceObserver` where supported.',
    tags: [
      'performance',
      'user timing',
      'performance.mark',
      'performance.measure',
      'PerformanceObserver',
      'profiling',
    ],
    demo: 'examples/custom-hooks/advanced/UsePerformanceMeasureDemo.tsx',
    sources: ['hooks/advanced/usePerformanceMeasure.ts'],
    tests: [
      'hooks/advanced/usePerformanceMeasure.test.tsx',
      'hooks/advanced/advanced.ssr.test.tsx',
      'examples/custom-hooks/advanced/AdvancedDemos.test.tsx',
    ],
    minReact: '18.0',
    support: {
      level: 'browser-limited',
      notes:
        'User Timing exists everywhere modern; `detail` needs User Timing Level 3 (falls back without it). Without `PerformanceObserver` entries are read back directly.',
    },
    officialDocs: [
      {
        label: 'MDN: User Timing API',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/User_timing',
      },
      {
        label: 'MDN: PerformanceObserver',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver',
      },
      { label: '<Profiler>', url: 'https://react.dev/reference/react/Profiler' },
    ],
    related: ['use-web-worker', 'use-debug-value'],
    concept:
      '`start(label)` places a mark and returns `end()`, which creates a `measure` named `<namespace>:<label>`; `measure(label, fn)` wraps sync or async work and records `success`/`error`. Results land in `measurements` (newest first).',
    problem:
      '`Date.now()` deltas scattered through code are imprecise, invisible in DevTools and hard to aggregate. User Timing entries show up in the Performance panel and can be collected by observers or RUM tools.',
    whenToUse: [
      'Timing user-visible operations in development or for RUM: save, search, import, worker jobs.',
      'Showing timings in internal tools or demos.',
    ],
    whenNotToUse: [
      'Timing React renders — use `<Profiler>` or React’s Performance tracks in DevTools; marking in a component body is a side effect during render.',
      'Core Web Vitals — use the `web-vitals` library.',
    ],
    api: {
      signature:
        'function usePerformanceMeasure(options?: { namespace?: string; maxEntries?: number }): PerformanceMeasureControls',
      params: [
        {
          name: 'options.namespace',
          type: 'string',
          description:
            'Prefix for entry names (default: a per-component id). Measures with this prefix created elsewhere are collected too when observing.',
          optional: true,
        },
        {
          name: 'options.maxEntries',
          type: 'number',
          description: 'Default 50, newest first.',
          optional: true,
        },
      ],
      returns:
        '`{ isSupported, usesObserver, measurements, start(label) → end(status?), measure(label, work), clear(), namespace }`.',
    },
    execution: [
      'Effect: when `PerformanceObserver` supports `measure`, observe `{ type: "measure" }` and keep entries with the namespace prefix.',
      '`end()`: `performance.measure(name, { start, detail })`, then clear the start mark; without an observer the entry is recorded immediately.',
      'Unmount: disconnect the observer and clear this hook’s marks/measures from the global buffer.',
    ],
    edgeCases: [
      'Observer callbacks are asynchronous in browsers, so new rows appear a moment after `end()`.',
      'Overlapping spans with the same label get unique start marks.',
    ],
    testing:
      'Tests cover the fallback path (no observer), a fake `PerformanceObserver` delivering namespaced and foreign entries, `maxEntries`, `clear()`, error status with re-throw, and the unsupported path.',
  },
];
