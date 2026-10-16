import type { CatalogEntry } from '../types';

const ESP_REPO = { label: 'esp-js on GitHub', url: 'https://github.com/esp/esp-js' };
const ESP_NPM = { label: 'esp-js on npm', url: 'https://www.npmjs.com/package/esp-js' };

const MIDDLEWARE_SOURCES = [
  'middleware/esp-js/espMiddleware.ts',
  'middleware/esp-js/bridge.ts',
  'middleware/esp-js/useEspReducer.ts',
  'middleware/esp-js/useEspBridge.ts',
];

export const entries: CatalogEntry[] = [
  {
    id: 'esp-middleware-overview',
    title: 'ESP-JS middleware for React hooks — architecture',
    section: 'esp',
    category: 'ESP-JS integration',
    level: 'advanced',
    summary:
      'How the original esp-js wrapper connects an event router to React reducers through dispatch middleware.',
    tags: [
      'esp-js',
      'middleware',
      'event router',
      'architecture',
      'useReducer',
      'publish',
      'broadcast',
    ],
    demo: 'examples/esp-js/EspVsReducerDemo.tsx',
    sources: [...MIDDLEWARE_SOURCES, 'middleware/esp-js/router.ts', 'middleware/esp-js/index.ts'],
    tests: [
      'middleware/esp-js/esp.test.tsx',
      'middleware/esp-js/esp.ssr.test.ts',
      'examples/esp-js/EspExamples.test.tsx',
    ],
    minReact: '19.0',
    officialDocs: [
      ESP_REPO,
      ESP_NPM,
      {
        label: 'useSyncExternalStore',
        url: 'https://react.dev/reference/react/useSyncExternalStore',
      },
      {
        label: 'Redux middleware',
        url: 'https://redux.js.org/understanding/history-and-design/middleware',
      },
    ],
    related: [
      'esp-original-workspace',
      'esp-stages-and-filtering',
      'esp-error-isolation',
      'esp-migration-notes',
      'reducer-middleware-pipeline',
      'state-management-comparison',
    ],
    concept:
      "Each React store (a reducer + middleware chain) registers a *model* with an esp-js `Router`. Two special actions — `ESP_PUBLISH_ACTION` (one model) and `ESP_BROADCAST_ACTION` (every observing model) — are intercepted by the ESP middleware and routed through esp-js. A bridge subscribes to the model's events and dispatches them back into the reducer as ordinary actions (`{ type: eventType, payload: event }`).",
    problem:
      'Independent widgets ("tiles") in a large workspace need to react to each other\'s events without sharing one global store or lifting state to a common ancestor, while keeping each widget\'s state local, testable and reducer-driven.',
    whenToUse: [
      'Your application already uses esp-js models and you want React function components and hooks to participate in the same event flow.',
      'Many independently mounted widgets must exchange events (publish to one, broadcast to many) with a deterministic, run-to-completion event loop.',
      'You need esp-js observation stages (preview → normal → committed → final) to filter, cancel or commit events before state changes.',
    ],
    whenNotToUse: [
      'A small app: lift state up, use context, or a store such as Zustand/Redux Toolkit. A router adds indirection and string-typed events.',
      "Server state: use TanStack Query, SWR or your framework's data APIs.",
      'When components only need to share state (not events): an external store with `useSyncExternalStore` is simpler.',
    ],
    api: {
      signature:
        'function useEspReducer<S, A extends { type: string }>(reducer: Reducer<S, EspStoreAction<A>>, initialState: S, options: UseEspReducerOptions<S, A>): readonly [state: S, dispatch: Dispatch<EspStoreAction<A>>, esp: EspStoreHandle]',
      params: [
        {
          name: 'reducer',
          type: 'Reducer<S, EspStoreAction<A>>',
          description:
            'Pure reducer. Also receives routed events and `ESP_PREPROCESS`/`ESP_POSTPROCESS` lifecycle actions.',
        },
        { name: 'initialState', type: 'S', description: 'Initial state (captured on mount).' },
        {
          name: 'options.modelName',
          type: 'string',
          description: 'Prefix of the model id; a `useId` suffix keeps instances unique.',
        },
        {
          name: 'options.observedEvents',
          type: 'string[]',
          description:
            'Event types this model receives. esp-js 8 drops events a model does not observe.',
        },
        {
          name: 'options.middleware',
          type: 'Middleware[]',
          description: 'Middleware running before the ESP middleware (outermost first).',
          optional: true,
        },
        {
          name: 'options.filters / commitEventTypes',
          type: 'Record<string, filter> / string[]',
          description: 'Preview-stage cancellation and normal-stage commits.',
          optional: true,
        },
        {
          name: 'options.onStage / onError',
          type: 'callbacks',
          description: 'Tracing for every stage; errors thrown while dispatching routed events.',
          optional: true,
        },
        {
          name: 'options.router',
          type: 'Router',
          description:
            "Defaults to `<EspRouterProvider>`'s router, else the shared workspace router.",
          optional: true,
        },
      ],
      returns:
        'The state, a stable `dispatch`, and `{ modelId, router, publish(eventType, event), broadcast(eventType, event) }`.',
    },
    execution: [
      'Mount: `useState` creates the store with `[...middleware, espMiddleware]` once; the state is read with `useSyncExternalStore`.',
      'Commit (effect): the bridge registers the model with the router and subscribes to each observed event type. Strict Mode registers, removes and re-registers it.',
      '`esp.publish(type, event)` dispatches `ESP_PUBLISH_ACTION`; the middleware calls `router.publishEvent(modelId, type, event)` and swallows the action.',
      'The router runs its dispatch loop: `preProcess` → preview → normal → (committed) → final → `postProcess` for each model with queued events.',
      'At the final stage the bridge dispatches `{ type, payload: event }` into the store; the reducer updates and React re-renders subscribers.',
      'Unmount: subscriptions are disposed and the model is removed from the router.',
    ],
    mistakes: [
      {
        title: 'Registering the model during render (the original bug)',
        wrong:
          'const [state, dispatch] = useReducer(reducer, initialState);\n// runs on every render → a new model + subscription each time\nconst [espDispatch] = applyESPMiddleware(state.modelId, dispatch);',
        why: 'Render must be pure. Every render created a bridge model and a router subscription that was never disposed, which is why the original demo asked you to refresh the preview when tiles stopped responding.',
        right:
          "const [state, dispatch, esp] = useEspReducer(reducer, initialState, {\n  modelName: 'accumulators',\n  observedEvents: [KEY_PRESSED],\n});",
      },
      {
        title: 'Letting a reducer exception reach esp-js',
        wrong:
          'router.getEventObservable(id, type).subscribe((env) => dispatch({ type, payload: env.event }));',
        why: 'Any exception inside an esp-js observer halts the router permanently (status `halted`), breaking every model on it.',
        right:
          'Use `registerEspBridge`/`useEspReducer`, which wrap dispatch, report via `onError` and keep the router running.',
      },
    ],
    edgeCases: [
      'Publishing to an unregistered model throws inside esp-js; the middleware catches it and calls `onError` (default: `console.error`).',
      'Events published from inside a handler are queued and processed after the current event (run-to-completion).',
      "Two stores with the same model id would receive each other's events, so registration throws on duplicates.",
      'esp-js 8 ships a UMD bundle that references `self` at import time, so it cannot be imported during Node SSR without a `globalThis.self` shim. The playground is client-rendered.',
    ],
    testing:
      'Store-level tests route publish/broadcast between models, verify lifecycle actions, unobserved-event dropping, preview cancellation, commit stages, router-halt protection and duplicate ids. Hook tests run two components under Strict Mode on one router and assert model removal on unmount.',
    production: [
      'Prefer one router per workspace/shell, provided with `<EspRouterProvider>`; create a fresh router per test.',
      'Type event payloads by declaring each observed event as a member of your action union.',
      'Use `onStage` for diagnostics in development only; it runs for every stage of every event.',
    ],
    diagram: {
      title: 'ESP-JS event propagation through the middleware',
      description:
        'A component dispatches a publish action; the ESP middleware routes it to the esp-js router, which runs the observation stages and the bridge dispatches the final-stage event back into the reducer.',
      mermaid: `sequenceDiagram
    participant C as Component
    participant M as Middleware chain
    participant E as ESP middleware
    participant R as esp-js Router
    participant B as Bridge model
    participant S as Reducer store
    C->>M: dispatch(ESP_PUBLISH_ACTION)
    M->>E: next(action)
    E->>R: publishEvent(modelId, type, event)
    R->>B: preProcess()
    B->>S: ESP_PREPROCESS_ACTION
    R->>R: preview, normal, committed stages
    R->>B: final stage envelope
    B->>S: dispatch({ type, payload: event })
    R->>B: postProcess([types])
    B->>S: ESP_POSTPROCESS_ACTION
    S-->>C: new state via useSyncExternalStore`,
    },
  },
  {
    id: 'esp-original-workspace',
    title: 'Original workspace & tiles (migrated)',
    section: 'esp',
    category: 'ESP-JS integration',
    level: 'advanced',
    summary:
      "The repository's original esp-js demo — workspace, price tile and accumulators tile — running on React 19 and esp-js 8.",
    tags: [
      'esp-js',
      'original example',
      'rxjs',
      'immer',
      'workspace',
      'tiles',
      'keyboard',
      'login',
    ],
    demo: 'examples/esp-js/EspOriginalWorkspaceDemo.tsx',
    sources: [
      'esp-demo/EspDemo.tsx',
      'esp-demo/context/context.tsx',
      'esp-demo/context/reducers.ts',
      'esp-demo/context/middleware/loginMiddleware.ts',
      'esp-demo/context/middleware/localStorageMiddleware.ts',
      'esp-demo/common/middleware/formValidationMiddleware.ts',
      'esp-demo/common/middleware/streamMiddleware.ts',
      'esp-demo/tiles/accumulators/AccumulatorsTile.tsx',
      'esp-demo/tiles/accumulators/context/reducers.ts',
      'esp-demo/tiles/priceTile/PriceTile.tsx',
      'esp-demo/tiles/priceTile/context/context.tsx',
      'esp-demo/tiles/priceTile/context/stream.ts',
      'esp-demo/Workspace.tsx',
    ],
    tests: ['esp-demo/EspDemo.test.tsx'],
    minReact: '19.0',
    officialDocs: [ESP_REPO],
    related: ['esp-middleware-overview', 'esp-migration-notes', 'esp-stages-and-filtering'],
    concept:
      'A fake shell ("workspace") with login and themes hosts two tiles. Each layer has its own reducer, middleware chain and esp-js model. Insert is *broadcast* (both tiles react), Delete is *published* (only the accumulators tile reacts). The price tile streams simulated prices with RxJS middleware.',
    problem:
      'Shows how middleware can provide esp-like processing stages for React state: validating before reducers, persisting, calling APIs, streaming, and routing events between independently mounted tiles.',
    execution: [
      'Workspace actions flow through validation → localStorage → login → ESP middleware → reducer — the original order.',
      'Login: validation reads the form from state; on success the login middleware calls the mocked `/api/login` and dispatches `LOGIN_SUCCESS_ACTION`.',
      'Insert key / button: `esp.broadcast(KEY_PRESSED, { key: "Insert" })` → every model observing `KEY_PRESSED` receives it at the final stage.',
      'Delete key / button: `esp.publish(...)` → only the accumulators model receives it.',
      'Add Pair: the stream middleware subscribes to the simulated price service and dispatches `PRICE_UPDATE` every 2 s; Unsubscribe All cancels every stream.',
    ],
    edgeCases: [
      'Delete is ignored while focus is in a text field so it still edits text; Insert works anywhere (as in the original).',
      'Duplicate accumulators now show an inline status message instead of `alert()`.',
      'Prices are random numbers from a local simulation, not market data.',
    ],
    testing:
      'An integration test renders the whole demo in Strict Mode and covers publish vs broadcast, the Insert key, duplicates, validation-before-login ordering, mocked login success/failure, theme persistence, price streaming and the click counter.',
  },
  {
    id: 'esp-stages-and-filtering',
    title: 'Observation stages, filtering & commits',
    section: 'esp',
    category: 'ESP-JS integration',
    level: 'advanced',
    summary:
      'Cancel events at the preview stage and commit them at the normal stage before they reach React state.',
    tags: ['esp-js', 'preview', 'commit', 'cancel', 'event filtering', 'validation', 'risk check'],
    demo: 'examples/esp-js/EspStagesDemo.tsx',
    sources: ['examples/esp-js/EspStagesDemo.tsx', 'middleware/esp-js/bridge.ts'],
    tests: ['examples/esp-js/EspExamples.test.tsx', 'middleware/esp-js/esp.test.tsx'],
    minReact: '19.0',
    officialDocs: [ESP_REPO],
    related: ['esp-middleware-overview', 'esp-error-isolation'],
    concept:
      'esp-js dispatches each event through ordered stages. The bridge observes `preview` to run per-event-type filters (returning `false` cancels the event), optionally commits at `normal` (which enables `committed`), and forwards `final`-stage events to the reducer.',
    problem:
      'Some events must be vetted (risk limits, permissions, stale data) by a separate concern before any state changes, without each reducer re-implementing the check.',
    whenToUse: [
      'Cross-cutting guards on routed events, e.g. risk limits, entitlements, kill switches.',
    ],
    whenNotToUse: [
      'Validation of local form input — validate in the event handler or in reducer middleware (see the workspace validation middleware).',
    ],
    execution: [
      'preview: the filter runs with the latest props (read through a ref); `false` → `context.cancel()`.',
      'normal: if the event type is in `commitEventTypes`, `context.commit()`.',
      'committed: runs only for committed events.',
      'final: the bridge dispatches into the reducer.',
    ],
    testing:
      'Tests assert canceled events never reach the reducer and that committed events pass through every stage in order.',
    diagram: {
      title: 'esp-js observation stages used by the bridge',
      description:
        'An event passes preview, where it may be canceled, then normal, committed and final, where it is dispatched to the reducer.',
      mermaid: `stateDiagram-v2
    [*] --> preview
    preview --> canceled: filter returns false
    preview --> normal: allowed
    normal --> committed: commit()
    normal --> final: not committed
    committed --> final
    final --> reducer: bridge dispatch
    canceled --> [*]
    reducer --> [*]`,
    },
  },
  {
    id: 'esp-error-isolation',
    title: 'Error isolation: keeping the router alive',
    section: 'esp',
    category: 'ESP-JS integration',
    level: 'advanced',
    summary:
      'Why a throwing reducer would halt esp-js permanently, and how the bridge contains it.',
    tags: ['esp-js', 'error handling', 'resilience', 'halted router'],
    demo: 'examples/esp-js/EspErrorIsolationDemo.tsx',
    sources: ['examples/esp-js/EspErrorIsolationDemo.tsx', 'middleware/esp-js/bridge.ts'],
    tests: ['examples/esp-js/EspExamples.test.tsx', 'middleware/esp-js/esp.test.tsx'],
    minReact: '19.0',
    officialDocs: [ESP_REPO],
    related: ['esp-middleware-overview', 'esp-stages-and-filtering'],
    concept:
      'esp-js treats an exception inside an observer as fatal: it logs the error, calls `addOnErrorHandler` handlers and moves to a terminal `halted` status. The bridge wraps every dispatch and filter in try/catch and reports through `onError`.',
    problem: 'One buggy reducer in one tile would otherwise stop every tile sharing the router.',
    production: [
      'Report `onError` to your error-tracking service and show a recoverable error state in the affected tile.',
      'Reducers should still not throw — validate inputs earlier (middleware or preview filters).',
    ],
    testing:
      'Tests publish an event whose reducer throws, then assert later events are still handled and the router is not halted.',
  },
  {
    id: 'esp-migration-notes',
    title: 'Migration: esp-js 2 + React 16.8 → esp-js 8 + React 19',
    section: 'esp',
    category: 'ESP-JS integration',
    level: 'intermediate',
    summary: 'What changed when the original integration was upgraded, and why.',
    tags: ['migration', 'esp-js 8', 'react 19', 'breaking changes', 'compatibility'],
    sources: ['middleware/esp-js/espMiddleware.ts', 'esp-demo/EspDemo.tsx'],
    tests: ['middleware/esp-js/esp.test.tsx', 'esp-demo/EspDemo.test.tsx'],
    minReact: '19.0',
    officialDocs: [
      ESP_REPO,
      {
        label: 'React 19 upgrade guide',
        url: 'https://react.dev/blog/2024/04/25/react-19-upgrade-guide',
      },
    ],
    related: ['esp-middleware-overview', 'esp-original-workspace'],
    concept:
      'The original behaviour (publish vs broadcast, lifecycle actions, middleware order, tiles) is preserved; the plumbing changed to be correct under React 18+/19 rendering rules and esp-js 8 semantics.',
    problem:
      'The original code ran on React 16.8.4 with Create React App 2, esp-js 2.0.1-rc.5, RxJS 6 and immer 3 — none of which build on current Node.',
    edgeCases: [
      '**esp-js 8 drops unobserved events.** The original bridge used `getAllEventsObservable()` without observing any event type; under esp-js 8 it receives nothing. Stores now declare `observedEvents`.',
      '**Import path.** `DisposableBase` is imported from the `esp-js` package root instead of `esp-js/src/...` sources.',
      '**Registration moved out of render.** `applyESPMiddleware` ran during render and leaked a model + subscription per render; `useEspReducer` registers in an effect with cleanup and survives Strict Mode.',
      '**Middleware shape.** `applyX(state, dispatch) => action => …` wrappers became Redux-style `(api) => (next) => (action) => …` middleware with a synchronous `getState()`.',
      '**Login.** The public reqres.in endpoint now requires an API key; the demo uses the mocked `/api/login`.',
      '**RxJS 7.** `Observable.create` and `never()` were replaced by `of()` and `NEVER`; streams are tracked per store and disposed on unmount.',
      '**immer 11.** `produce` is a named export; `delete draft.x` for non-optional fields became explicit resets.',
      '**React 19.** `ReactDOM.render` → `createRoot`; contexts render as `<Context value>`; the `uuid` dependency was replaced by `useId`.',
      'Removed: the unused `TYPING_USERNAME`/`TYPING_PASSWORD` actions and `validateForm` helper (superseded in the original by the generic `TYPING` action and validation middleware).',
    ],
    testing: 'The migrated behaviour is pinned by the integration test of the original demo.',
  },
];
