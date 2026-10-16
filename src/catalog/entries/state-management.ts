import type { CatalogEntry } from '../types';

const REDUCERS = 'Reducers & middleware';
const LIBRARIES = 'Libraries';

const USE_REDUCER_DOCS = {
  label: 'useReducer',
  url: 'https://react.dev/reference/react/useReducer',
};
const USE_SYNC_EXTERNAL_STORE_DOCS = {
  label: 'useSyncExternalStore',
  url: 'https://react.dev/reference/react/useSyncExternalStore',
};
const REDUX_MIDDLEWARE_DOCS = {
  label: 'Redux: middleware',
  url: 'https://redux.js.org/understanding/history-and-design/middleware',
};

const MIDDLEWARE_DIR = 'middleware/reducer/middleware';
const EXAMPLES = 'examples/state-management';

export const entries: CatalogEntry[] = [
  // ---------------------------------------------------------------------------
  {
    id: 'usestate-vs-usereducer',
    title: 'useState vs useReducer',
    section: 'state',
    category: REDUCERS,
    level: 'beginner',
    summary:
      'The same booking widget built twice: rules spread over handlers vs one pure, testable reducer.',
    tags: ['useState', 'useReducer', 'reducer', 'state transitions', 'refactoring'],
    demo: `${EXAMPLES}/basics/UseStateVsUseReducerDemo.tsx`,
    sources: [`${EXAMPLES}/basics/UseStateVsUseReducerDemo.tsx`, `${EXAMPLES}/basics/booking.ts`],
    tests: [
      `${EXAMPLES}/basics/UseStateVsUseReducerDemo.test.tsx`,
      `${EXAMPLES}/basics/booking.test.ts`,
    ],
    minReact: '16.8',
    support: { level: 'universal' },
    officialDocs: [
      USE_REDUCER_DOCS,
      {
        label: 'Extracting state logic into a reducer',
        url: 'https://react.dev/learn/extracting-state-logic-into-a-reducer',
      },
    ],
    related: [
      'reducer-middleware-pipeline',
      'context-reducer-split',
      'state-management-comparison',
    ],
    concept:
      '`useState` stores independent values and you write the update logic in each event handler. `useReducer` stores one value and moves every transition into a pure `(state, action) => nextState` function; handlers only describe *what happened* with `dispatch(action)`.',
    problem:
      'When one update must change several values together (removing the last adult also removes the children), `useState` spreads the rule across handlers and needs several setters per event, which is easy to get subtly wrong as the component grows.',
    whenToUse: [
      '`useState`: independent values (an input, a toggle, an open panel).',
      '`useReducer`: several values that change together, or the next state depends on the previous one in non-trivial ways.',
      '`useReducer`: you want to unit-test the logic without rendering, or pass one stable `dispatch` down instead of many callbacks.',
    ],
    whenNotToUse: [
      'Do not reach for `useReducer` for a single boolean or string: the action/switch ceremony adds nothing.',
      'Neither is a cache for server data: use TanStack Query or SWR.',
    ],
    execution: [
      'Both versions render from current state; derived values (`seatsLeft`, `canAddChild`) are computed during render, not stored.',
      '`useState`: a click calls one or two setters; React batches them into one re-render.',
      '`useReducer`: a click dispatches one action; React calls the reducer during the next render with the queued actions.',
      'Returning the *same* state object from the reducer (a disallowed action) lets React bail out of the re-render.',
    ],
    mistakes: [
      {
        title: 'Mutating state in the reducer',
        wrong: "case 'addAdult':\n  state.adults += 1;\n  return state;",
        why: 'The returned object is the same reference, so React assumes nothing changed and skips the render; other code holding the old object sees it change underneath.',
        right: "case 'addAdult':\n  return { ...state, adults: state.adults + 1 };",
      },
      {
        title: 'Side effects inside the reducer',
        wrong: "case 'reset':\n  localStorage.removeItem('booking');\n  return initialBooking;",
        why: 'Reducers must be pure: Strict Mode calls them twice in development, and React may re-run them. Do effects in handlers, effects or dispatch middleware.',
      },
    ],
    edgeCases: [
      'Clicking a disabled-looking action twice: the reducer re-checks the rules, so the UI and the logic cannot disagree.',
      '`dispatch` is stable for the lifetime of the component; setters from `useState` are stable too.',
    ],
    testing:
      'The reducer is tested as a plain function (caps, cross-field rule, same-reference bail-out). The demo test drives both panels with identical clicks and asserts identical results.',
    production: [
      'Type actions as a discriminated union so `switch (action.type)` is exhaustive.',
      'Keep derived values out of state; compute them from state in render (or in a selector).',
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'reducer-middleware-pipeline',
    title: 'useReducer + dispatch middleware',
    section: 'state',
    category: REDUCERS,
    level: 'advanced',
    summary:
      'Logger, analytics, validation, thunk, error reporting and persistence composed around one reducer — toggle each and watch the pipeline.',
    tags: [
      'middleware',
      'useReducerWithMiddleware',
      'logger',
      'analytics',
      'validation',
      'thunk',
      'async',
      'error reporting',
      'persistence',
      'localStorage',
      'ordering',
    ],
    demo: `${EXAMPLES}/pipeline/MiddlewarePipelineDemo.tsx`,
    sources: [
      `${EXAMPLES}/pipeline/MiddlewarePipelineDemo.tsx`,
      `${EXAMPLES}/pipeline/cart.ts`,
      `${EXAMPLES}/pipeline/pipelineTrace.ts`,
      `${MIDDLEWARE_DIR}/logger.ts`,
      `${MIDDLEWARE_DIR}/analytics.ts`,
      `${MIDDLEWARE_DIR}/validation.ts`,
      `${MIDDLEWARE_DIR}/thunk.ts`,
      `${MIDDLEWARE_DIR}/errorReporting.ts`,
      `${MIDDLEWARE_DIR}/persistence.ts`,
      `${MIDDLEWARE_DIR}/actionTypes.ts`,
      'middleware/reducer/useReducerWithMiddleware.ts',
      'middleware/reducer/createReducerStore.ts',
      'middleware/reducer/compose.ts',
      'middleware/reducer/types.ts',
    ],
    tests: [
      `${EXAMPLES}/pipeline/MiddlewarePipelineDemo.test.tsx`,
      `${MIDDLEWARE_DIR}/ordering.test.ts`,
      `${MIDDLEWARE_DIR}/logger.test.ts`,
      `${MIDDLEWARE_DIR}/analytics.test.ts`,
      `${MIDDLEWARE_DIR}/validation.test.ts`,
      `${MIDDLEWARE_DIR}/thunk.test.ts`,
      `${MIDDLEWARE_DIR}/errorReporting.test.ts`,
      `${MIDDLEWARE_DIR}/persistence.test.ts`,
      'middleware/reducer/useReducerWithMiddleware.test.tsx',
    ],
    minReact: '18.0',
    support: {
      level: 'universal',
      notes:
        'The store runs outside React and is read with `useSyncExternalStore`. Persistence resolves storage lazily, so creating the middleware on the server is safe.',
    },
    officialDocs: [REDUX_MIDDLEWARE_DOCS, USE_SYNC_EXTERNAL_STORE_DOCS, USE_REDUCER_DOCS],
    related: [
      'undo-redo-reducer-enhancer',
      'external-reducer-store',
      'redux-toolkit',
      'use-local-storage',
      'esp-middleware-overview',
    ],
    concept:
      'Middleware wrap `dispatch`: `(api) => (next) => (action) => { ...; next(action); ... }`. Each can inspect the action and state, perform side effects, swallow the action (not call `next`), transform it, or dispatch new actions through the whole chain with `api.dispatch`. The reducer stays pure. The library in `src/middleware/reducer/middleware/` provides six typed middleware (`Middleware<S, A>`), each with injected sinks so they are testable and can feed the screen.',
    problem:
      'Cross-cutting concerns — logging, analytics, validation, async loading, error reporting, persistence — otherwise end up copied into every event handler or smuggled into reducers, which must stay pure. The original repository already used this pattern (e.g. `formValidationMiddleware`, `localStorageMiddleware`, `loginMiddleware` in `src/esp-demo`), but with `any`-typed dispatch and render-time state; this library generalises them with types and `getState()`. The esp-js integration (see the *ESP-JS Integration* section, entry `esp-middleware-overview`) is one more middleware in the same chain that routes actions to an event router.',
    whenToUse: [
      'Concerns that apply to many actions: logging, analytics, persistence, error reporting.',
      'Rules that must hold for every dispatch, whoever dispatches: validation before the reducer.',
      'Async flows that should be visible as actions (`*_REQUESTED` / `*_LOADED` / `*_FAILED`).',
    ],
    whenNotToUse: [
      'A single component with one effect: an event handler is clearer than a middleware.',
      'Server data with caching, dedupe and refetching: use TanStack Query or SWR instead of thunks.',
      'A large app that wants DevTools time travel, RTK Query and shared conventions: use Redux Toolkit (the same middleware contract).',
    ],
    api: {
      signature:
        'function useReducerWithMiddleware<S, A>(reducer: Reducer<S, A>, initialState: S, middleware?: ReadonlyArray<Middleware<S, A>>): readonly [state: S, dispatch: Dispatch<A>, store: ReducerStore<S, A>]',
      params: [
        {
          name: 'createLogger({ sink?, predicate?, now? })',
          type: 'Middleware<S, A>',
          description:
            'Emits `{ action, prevState, nextState, changed, durationMs }` after `next`. Default sink: collapsed (or expanded) console groups via `createConsoleSink`.',
        },
        {
          name: 'createAnalyticsMiddleware({ track, events, onError? })',
          type: 'Middleware<S, A>',
          description:
            '`events` maps action types to `(action, nextState, prevState) => AnalyticsEvent | null`. Errors in mapping or `track` are caught.',
        },
        {
          name: 'createValidationMiddleware({ validators, onInvalid })',
          type: 'Middleware<S, A>',
          description:
            'Validators by action type return errors; on failure the action is swallowed and `onInvalid(errors, action)` is dispatched instead.',
        },
        {
          name: 'createThunkMiddleware(extra?)',
          type: 'Middleware<S, ThunkActionOf<S, A, Extra>>',
          description:
            'Lets the store dispatch `(dispatch, getState, extra) => unknown`. The store action type is the union `A | Thunk<S, A>`; use `isThunk` to narrow.',
        },
        {
          name: 'createErrorReportingMiddleware({ report, toAction?, rethrow? })',
          type: 'Middleware<S, A>',
          description:
            'Catches synchronous errors from later middleware and the reducer, reports them, optionally dispatches an error action.',
        },
        {
          name: 'createPersistenceMiddleware({ key, select, getStorage?, debounceMs?, serialize?, onSaved?, onError? })',
          type: 'PersistenceMiddleware<S, A>',
          description:
            'Debounced save of a state slice; `flush()` / `cancel()` control the pending write. `onError` receives `unavailable`, `quota`, `write` and `serialize` errors. Pair with `hydrate({ key, validate })`.',
        },
      ],
      returns:
        'The current state, a stable `dispatch` that runs the chain, and the underlying store (`getState`, `dispatch`, `subscribe`).',
    },
    execution: [
      'Setup (once, on mount): `applyMiddleware` calls each factory with `{ getState, dispatch }`, then chains them right-to-left so the first middleware is outermost.',
      'Dispatch: the action enters middleware 1, which calls `next` → middleware 2 … → the reducer. Code after `next(action)` runs on the way back out and sees the new state via `getState()` synchronously.',
      'The reducer runs outside React; if the state changed, subscribers are notified and `useSyncExternalStore` schedules a re-render.',
      '`api.dispatch(action)` from inside a middleware (validation failure, thunk results, error actions) re-enters the chain from the top.',
      'Recommended order (pinned by `ordering.test.ts`): errorReporting → thunk → logger → validation → analytics → persistence → reducer.',
      'Unmount: the demo flushes the pending persistence write; nothing else holds timers or listeners.',
    ],
    mistakes: [
      {
        title: 'Throwing from a reducer to reject an action',
        wrong:
          "case 'ADD_ITEM':\n  if (!action.name) throw new Error('Name required');\n  return { ...state, items: [...state.items, action] };",
        why: 'Reducers should not throw: an exception aborts the dispatch, escapes into whatever called `dispatch` (an event handler, a timer) and nothing commits. Validate in middleware and dispatch a failure action; keep error reporting as a safety net for real bugs.',
        right:
          "createValidationMiddleware({\n  validators: { ADD_ITEM: (a) => (a.name ? null : { name: 'Name required' }) },\n  onInvalid: (errors) => ({ type: 'VALIDATION_FAILED', errors }),\n});",
      },
      {
        title: 'Reading state from the render closure',
        wrong:
          'const validate = (state, dispatch) => (action) => {\n  if (state.items.length >= 5) return; // state captured at render time\n  dispatch(action);\n};',
        why: 'The original `formValidationMiddleware` received `state` from render, so two quick dispatches validated against stale state. `api.getState()` always returns the store’s current state.',
      },
      {
        title: 'Putting the error reporter last',
        wrong: 'useReducerWithMiddleware(reducer, initial, [logger, analytics, errorReporting]);',
        why: 'It can only catch what runs inside its `next`: the reducer, yes, but a throwing logger sink or analytics mapper placed before it escapes. Put it first.',
      },
      {
        title: 'Expecting to await a thunk',
        wrong: 'await dispatch(loadProducts()); // Dispatch<A> returns void',
        why: 'This store’s `dispatch` returns `void`, and a rejected promise is invisible to middleware. Thunks report outcomes by dispatching actions (or use Redux Toolkit, whose dispatch returns the thunk’s promise).',
      },
    ],
    edgeCases: [
      'A validator rejecting the failure action itself would loop forever; the middleware throws a descriptive error instead.',
      'An error action that throws again is reported once more but not re-dispatched.',
      'Persistence: unchanged slices (`Object.is`) never schedule a write; a burst of changes produces one write; quota errors are reported as `quota` and the next change retries.',
      'Corrupt or outdated stored data fails `hydrate`’s `validate` guard and the default state is used.',
      'Middleware are captured on mount (like `createStore`). The demo toggles them through a wrapper that bypasses disabled stages, not by changing the array.',
    ],
    testing:
      'Each middleware has unit tests against `createReducerStore` with injected sinks and fake timers (persistence). `ordering.test.ts` traces a valid action, a rejected one, a thunk and reducer/middleware crashes through the full chain, and shows what changes when the order changes. The demo test drives the UI: the pipeline trace, the logger panel, analytics, validation on/off, the thunk against MSW, error reporting on/off and hydration.',
    production: [
      'Keep middleware stateless or create them per store; the persistence middleware owns a timer per instance.',
      'Send analytics and error reports asynchronously and never let them throw into dispatch.',
      'Version persisted keys (`app:cart:v1`) and validate on hydrate.',
      'Log in development only, or behind a `predicate`, to avoid leaking state into production consoles.',
    ],
    diagram: {
      title: 'Middleware execution order',
      description:
        'A valid ADD_ITEM passes every middleware on the way in; code after next() runs on the way out, innermost first. An invalid action stops at validation, which dispatches VALIDATION_FAILED from the top of the chain.',
      mermaid: `sequenceDiagram
  participant UI as Component
  participant E as errorReporting
  participant T as thunk
  participant L as logger
  participant V as validation
  participant A as analytics
  participant P as persistence
  participant R as reducer
  UI->>E: dispatch(ADD_ITEM)
  E->>T: next(action)
  T->>L: next(action) (not a function)
  L->>V: next(action) (prev state saved)
  V->>A: next(action) (valid)
  A->>P: next(action)
  P->>R: next(action)
  R-->>P: new state committed
  P-->>A: schedule debounced save
  A-->>L: track(Product Added)
  L-->>E: log prev/action/next
  E-->>UI: return (no error)
  Note over V: invalid action: no next()
  V->>E: api.dispatch(VALIDATION_FAILED)`,
    },
  },

  // ---------------------------------------------------------------------------
  {
    id: 'undo-redo-reducer-enhancer',
    title: 'Undo/redo reducer enhancer',
    section: 'state',
    category: REDUCERS,
    level: 'intermediate',
    summary:
      '`undoable(reducer)` adds past/present/future and UNDO/REDO to any reducer — an enhancer, not middleware.',
    tags: ['undo', 'redo', 'history', 'reducer enhancer', 'higher-order reducer', 'time travel'],
    demo: `${EXAMPLES}/undo/UndoRedoDemo.tsx`,
    sources: [
      `${MIDDLEWARE_DIR}/undoable.ts`,
      `${EXAMPLES}/undo/UndoRedoDemo.tsx`,
      `${EXAMPLES}/undo/pixelArt.ts`,
    ],
    tests: [`${MIDDLEWARE_DIR}/undoable.test.ts`, `${EXAMPLES}/undo/UndoRedoDemo.test.tsx`],
    minReact: '16.8',
    support: { level: 'universal' },
    officialDocs: [
      {
        label: 'Redux: implementing undo history',
        url: 'https://redux.js.org/usage/implementing-undo-history',
      },
      USE_REDUCER_DOCS,
    ],
    related: ['reducer-middleware-pipeline', 'usestate-vs-usereducer'],
    concept:
      'A reducer enhancer is a function from reducer to reducer. `undoable(reducer, { limit, shouldRecord })` returns a reducer whose state is `{ past, present, future }`: user actions go to the wrapped reducer and push the previous `present` onto `past`; `UNDO`/`REDO` move snapshots between the stacks; `CLEAR_HISTORY` forgets them.',
    problem:
      'Undo is a property of *state*, not of dispatch. Implementing it in every reducer (or with mutable command objects) duplicates logic; a generic enhancer adds it to any pure reducer without touching it.',
    whenToUse: [
      'Editors, drawing tools, form builders, kanban boards — anything where users expect Ctrl+Z.',
      'State that is cheap to snapshot (immutable updates share unchanged structure).',
    ],
    whenNotToUse: [
      'Server-side changes: undoing local state does not undo a POST. Model those as compensating requests.',
      'Very large states with frequent changes: snapshots cost memory; lower `limit` or store patches (e.g. Immer patches) instead.',
    ],
    api: {
      signature:
        'function undoable<S, A>(reducer: Reducer<S, A>, options?: { limit?: number; shouldRecord?: (action: A, next: S, previous: S) => boolean }): Reducer<UndoableState<S>, A | UndoableAction>',
      params: [
        {
          name: 'reducer',
          type: 'Reducer<S, A>',
          description: 'Any pure reducer. It never sees UNDO/REDO.',
        },
        {
          name: 'options.limit',
          type: 'number',
          description: 'Max undo steps (default 50).',
          optional: true,
        },
        {
          name: 'options.shouldRecord',
          type: '(action, next, previous) => boolean',
          description:
            'Return `false` for changes that should update `present` without an undo step (focus, selection).',
          optional: true,
        },
      ],
      returns:
        'The enhanced reducer. Helpers: `createUndoableState(initial)`, `undo()`, `redo()`, `clearHistory()`, `isUndoableAction`.',
    },
    execution: [
      'Enhancer vs middleware: middleware wrap `dispatch` and decide *whether/when* actions reach the reducer (side effects live there). An enhancer wraps the *reducer* and changes *what the state is*; it stays pure.',
      'So it works with plain `useReducer`, `useReducerWithMiddleware` or Redux, and composes with middleware: logging `UNDO` shows the restored state.',
      'A user action that returns the same `present` creates no history; any recorded change clears `future`.',
    ],
    mistakes: [
      {
        title: 'Undo stored in middleware',
        wrong:
          'const undoMiddleware = (api) => (next) => (action) => { history.push(api.getState()); next(action); };',
        why: 'History kept outside the state is invisible to React, does not survive serialisation and records actions that did not change anything. Keep it in state with an enhancer.',
      },
      {
        title: 'Recording every keystroke or focus change',
        wrong: 'undoable(reducer)',
        why: 'Undo then steps through focus moves instead of edits. Use `shouldRecord` to skip transient changes.',
        right: "undoable(reducer, { shouldRecord: (action) => action.type !== 'focus' })",
      },
    ],
    edgeCases: [
      'UNDO/REDO with an empty stack returns the same state object (no re-render).',
      '`limit` drops the oldest steps; a non-positive limit throws a `RangeError` at setup.',
      'Keyboard: Ctrl/⌘+Z and Ctrl/⌘+Shift+Z are handled on the focused cell, so typing elsewhere on the page is unaffected.',
    ],
    testing:
      'Unit tests cover undo/redo order, future clearing, no-op actions, the limit, unrecorded actions, clearing history and use with plain `useReducer`. The demo test paints cells, undoes, redoes and uses the keyboard shortcuts.',
    production: [
      'Group rapid changes (drag, typing) into one step, e.g. record only on pointer-up or after a pause.',
      'Persist `present` only; history is usually session-scoped.',
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'context-reducer-split',
    title: 'Context + reducer (split contexts)',
    section: 'state',
    category: REDUCERS,
    level: 'intermediate',
    summary:
      'Share a reducer through separate state and dispatch contexts so dispatch-only components never re-render.',
    tags: ['useContext', 'createContext', 'useReducer', 'provider', 'prop drilling', 're-renders'],
    demo: `${EXAMPLES}/context/ContextReducerDemo.tsx`,
    sources: [
      `${EXAMPLES}/context/ContextReducerDemo.tsx`,
      `${EXAMPLES}/context/TodosProvider.tsx`,
      `${EXAMPLES}/context/todosContext.ts`,
      `${EXAMPLES}/context/todosReducer.ts`,
    ],
    tests: [`${EXAMPLES}/context/ContextReducerDemo.test.tsx`],
    minReact: '19.0',
    support: {
      level: 'universal',
      notes:
        'Uses React 19’s `<Context value>` provider and `use(Context)`. On React 18 write `<Context.Provider value>` and `useContext(Context)`.',
    },
    officialDocs: [
      {
        label: 'Scaling up with reducer and context',
        url: 'https://react.dev/learn/scaling-up-with-reducer-and-context',
      },
      { label: 'createContext', url: 'https://react.dev/reference/react/createContext' },
    ],
    related: ['usestate-vs-usereducer', 'external-reducer-store', 'zustand'],
    concept:
      'A provider owns `useReducer` and publishes `state` and `dispatch` through two contexts. Custom hooks (`useTodos`, `useTodosDispatch`) read them and throw a clear error outside the provider.',
    problem:
      'Prop drilling a reducer through many layers is noisy. A single context holding `{ state, dispatch }` fixes that but re-renders *every* consumer on each change — including components that only dispatch.',
    whenToUse: [
      'Feature-scoped state shared by a subtree (a wizard, a todo board, a settings page).',
      'Low-frequency app-wide values: theme, locale, the signed-in user.',
    ],
    whenNotToUse: [
      'High-frequency updates read by many components: context has no selectors, so every consumer re-renders. Use an external store with `useSyncExternalStore`, Zustand, Jotai or Redux.',
      'Server data: use a query cache.',
    ],
    execution: [
      'Render: the provider renders `children` it received as props, so a state change re-renders the provider but not those elements.',
      'Consumers of the *state* context re-render because its value changed; consumers of only the *dispatch* context do not, because `dispatch` is stable.',
      'The render counters in the demo make this visible: the form’s count does not move when todos change.',
    ],
    mistakes: [
      {
        title: 'One context with a fresh object',
        wrong: 'return <TodosContext value={{ state, dispatch }}>{children}</TodosContext>;',
        why: 'The object is new on every render, so every consumer re-renders on every change, even those that only dispatch.',
        right:
          '<TodosStateContext value={state}>\n  <TodosDispatchContext value={dispatch}>{children}</TodosDispatchContext>\n</TodosStateContext>',
      },
      {
        title: 'Rendering children inline inside the provider component',
        wrong:
          'function TodosProvider() {\n  const [state, dispatch] = useReducer(...);\n  return <Ctx value={state}><App /></Ctx>; // <App /> created here\n}',
        why: 'Creating the subtree inside the stateful component re-renders all of it on every change; pass it as `children` instead.',
      },
    ],
    edgeCases: [
      'Using a hook outside the provider throws a descriptive error instead of returning `null` silently.',
      'Two providers create two independent stores (useful for tests and for repeated widgets).',
    ],
    testing:
      'The demo test adds, toggles, clears and deletes todos, asserts via `<RenderCount>` (Profiler commits) that the dispatch-only form does not re-render, and checks the outside-provider errors.',
    production: [
      'Split further by update frequency (e.g. a separate context for a rapidly changing value).',
      'Export only the custom hooks and the provider, not the raw contexts, from a feature module.',
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'external-reducer-store',
    title: 'External store + useSyncExternalStore',
    section: 'state',
    category: REDUCERS,
    level: 'advanced',
    summary:
      '`createReducerStore` outside React, read with selectors through `useStoreSelector`; timers dispatch without hooks.',
    tags: [
      'useSyncExternalStore',
      'createReducerStore',
      'selector',
      'external store',
      'subscriptions',
      'tearing',
    ],
    demo: `${EXAMPLES}/external-store/ExternalStoreDemo.tsx`,
    sources: [
      'middleware/reducer/useStoreSelector.ts',
      'middleware/reducer/createReducerStore.ts',
      `${EXAMPLES}/external-store/ExternalStoreDemo.tsx`,
      `${EXAMPLES}/external-store/pricesStore.ts`,
    ],
    tests: [
      'middleware/reducer/useStoreSelector.test.tsx',
      `${EXAMPLES}/external-store/ExternalStoreDemo.test.tsx`,
    ],
    minReact: '18.0',
    support: {
      level: 'universal',
      notes:
        'The server snapshot is the store’s current state; render the same store on the client.',
    },
    officialDocs: [USE_SYNC_EXTERNAL_STORE_DOCS],
    related: ['reducer-middleware-pipeline', 'context-reducer-split', 'rxjs-observable-store'],
    concept:
      'A store is `getState`, `dispatch` and `subscribe`. `useStoreSelector(store, selector)` passes `subscribe` and `() => selector(store.getState())` to `useSyncExternalStore`, so a component re-renders only when its selected value changes (`Object.is`).',
    problem:
      'Some state is produced outside React (sockets, price feeds, timers, legacy code) and must be readable both by components and by plain functions. Copying it into React state with effects causes tearing and extra renders; context re-renders every consumer.',
    whenToUse: [
      'Bridging a non-React source: WebSocket feeds, browser APIs, an existing store.',
      'Many components each needing a small slice of frequently changing state.',
      'Code without hooks (timers, services, tests) that must read or update the same state.',
    ],
    whenNotToUse: [
      'Plain component state: `useState`/`useReducer` are simpler and need no subscription code.',
      'If you want a maintained store with middleware and DevTools: Zustand or Redux Toolkit already build on `useSyncExternalStore`.',
    ],
    api: {
      signature:
        'function useStoreSelector<S, A, Selected>(store: Pick<ReducerStore<S, A>, "getState" | "subscribe">, selector: (state: S) => Selected): Selected',
      params: [
        {
          name: 'store',
          type: 'ReducerStore<S, A>',
          description: 'Usually from `createReducerStore`.',
        },
        {
          name: 'selector',
          type: '(state: S) => Selected',
          description:
            'Must return a primitive or an existing reference. Define it at module level (or memoise it) so the snapshot function is stable.',
        },
      ],
      returns: 'The selected value.',
    },
    execution: [
      'Render: `useSyncExternalStore` calls the snapshot function; the result is the selected slice.',
      'Commit: React subscribes; on every store notification it re-reads the snapshot and re-renders only if it changed.',
      'Concurrent rendering: React re-checks the snapshot before committing, so all components see the same store version (no tearing).',
      'Unmount: React calls the unsubscribe function returned by `subscribe`.',
    ],
    mistakes: [
      {
        title: 'Selector that builds a new object',
        wrong: 'useStoreSelector(store, (s) => ({ bid: s.quotes.EURUSD.bid, ticks: s.ticks }));',
        why: 'Every read returns a new object, so React sees a changed snapshot on every check and re-renders in a loop (React warns "The result of getSnapshot should be cached").',
        right:
          'const bid = useStoreSelector(store, selectEurBid);\nconst ticks = useStoreSelector(store, selectTicks);',
      },
      {
        title: 'Mirroring the store with useEffect + setState',
        wrong:
          'useEffect(() => store.subscribe(() => setQuote(store.getState().quotes.EURUSD)), []);',
        why: 'Renders once with stale data, misses updates between render and effect, and can tear under concurrent rendering.',
      },
    ],
    edgeCases: [
      'Parent re-renders still re-render children; the demo wraps tiles in `memo` so the counters isolate store-driven renders.',
      'The feed effect clears its interval on stop and unmount.',
    ],
    testing:
      'Hook tests prove that unrelated dispatches do not re-render and that unmount unsubscribes. The demo test checks per-tile commit counts and drives the timer feed with fake timers.',
    production: [
      'For derived objects use memoised selectors (e.g. `createSelector`) or select primitives and derive with `useMemo`.',
      'Consider `use-sync-external-store/with-selector` (used by React Redux) when you need a custom equality function.',
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'redux-toolkit',
    title: 'Redux Toolkit + React Redux',
    section: 'state',
    category: LIBRARIES,
    level: 'intermediate',
    summary:
      '`configureStore`, `createSlice`, `createAsyncThunk` against /api/todos, typed hooks, a custom middleware and the listener middleware.',
    tags: [
      'redux',
      'redux toolkit',
      'rtk',
      'react-redux',
      'useSelector',
      'useDispatch',
      'createAsyncThunk',
      'listener middleware',
      'immer',
    ],
    demo: `${EXAMPLES}/redux/ReduxToolkitDemo.tsx`,
    sources: [
      `${EXAMPLES}/redux/ReduxToolkitDemo.tsx`,
      `${EXAMPLES}/redux/store.ts`,
      `${EXAMPLES}/redux/todosSlice.ts`,
      `${EXAMPLES}/redux/notificationsSlice.ts`,
      `${EXAMPLES}/redux/hooks.ts`,
      `${EXAMPLES}/shared/todosApi.ts`,
    ],
    tests: [`${EXAMPLES}/redux/ReduxToolkitDemo.test.tsx`],
    minReact: '18.0',
    support: { level: 'universal', notes: 'React Redux 9 supports React 18 and 19.' },
    officialDocs: [
      { label: 'RTK: configureStore', url: 'https://redux-toolkit.js.org/api/configureStore' },
      { label: 'RTK: createAsyncThunk', url: 'https://redux-toolkit.js.org/api/createAsyncThunk' },
      {
        label: 'RTK: createListenerMiddleware',
        url: 'https://redux-toolkit.js.org/api/createListenerMiddleware',
      },
      {
        label: 'React Redux with TypeScript',
        url: 'https://react-redux.js.org/using-react-redux/usage-with-typescript',
      },
    ],
    related: [
      'reducer-middleware-pipeline',
      'zustand',
      'tanstack-query',
      'state-management-comparison',
    ],
    concept:
      'Redux Toolkit is the official way to write Redux: `createSlice` generates actions and an Immer-powered reducer, `createAsyncThunk` dispatches pending/fulfilled/rejected actions around a promise, and `configureStore` adds the thunk, immutability and serialisability checks and DevTools. React Redux’s `useSelector` subscribes to slices; `.withTypes()` creates typed hooks.',
    problem:
      'Large client state touched by many features needs explicit, inspectable updates, a shared middleware pipeline and conventions a team can follow. The demo’s `makeStore()` is called once per mount (in `useState`), so there is no global store and tests never share state.',
    whenToUse: [
      'Large apps and teams that benefit from explicit actions, DevTools time travel and conventions.',
      'Complex client-side workflows with side effects that react to actions (listener middleware).',
      'When you also want server caching inside the same store (RTK Query).',
    ],
    whenNotToUse: [
      'Small apps or local state: `useState`/`useReducer` or Zustand need far less setup.',
      'Pure server-state screens: TanStack Query, SWR or RTK Query instead of hand-written thunks with status flags.',
    ],
    api: {
      signature:
        'configureStore({ reducer, middleware: (getDefaultMiddleware) => getDefaultMiddleware().prepend(listener.middleware).concat(audit) })',
      params: [
        {
          name: 'middleware callback',
          type: '(getDefaultMiddleware) => Tuple<Middleware[]>',
          description:
            'RTK 2 requires the callback form (or a `Tuple`) so dispatch types are inferred. `.prepend` / `.concat` keep the defaults (thunk, dev checks).',
        },
        {
          name: 'createAsyncThunk<Returned, Arg, { rejectValue; state }>(type, payloadCreator, { condition })',
          type: 'AsyncThunk',
          description:
            '`rejectWithValue` returns a typed error payload; `condition` skips duplicate requests (e.g. Strict Mode’s double effect).',
        },
        {
          name: 'useSelector.withTypes<RootState>() / useDispatch.withTypes<AppDispatch>()',
          type: 'typed hooks',
          description: 'Defined once in `hooks.ts`; no annotations at call sites.',
        },
      ],
    },
    execution: [
      'Mount: `makeStore` creates the listener middleware and the store; `<Provider store>` makes it available.',
      'Effect: `dispatch(fetchTodos())` dispatches `todos/fetch/pending` synchronously, then fulfilled/rejected when the request settles.',
      'Add: the component awaits `dispatch(addTodo(title))` (thunk dispatch returns a promise) and checks `addTodo.fulfilled.match(result)`.',
      'Listener middleware reacts to `addTodo.fulfilled/rejected` by dispatching a notification; another listener waits with `api.delay` and dismisses it.',
      'The custom audit middleware runs last and logs every action with the resulting todo count.',
    ],
    mistakes: [
      {
        title: 'Array form that drops the defaults',
        wrong: 'configureStore({ reducer, middleware: [audit] })',
        why: 'In RTK 2 the array form is a type error, and replacing the defaults removes the thunk middleware and the development checks.',
        right: 'middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(audit)',
      },
      {
        title: 'Module-level store in tests',
        wrong: 'export const store = configureStore({ reducer });',
        why: 'State leaks between tests and between server requests. Export a `makeStore()` factory and create a store per test / per request / per mount.',
      },
      {
        title: 'Selecting a new object',
        wrong:
          'const { items, filter } = useAppSelector((s) => ({ items: s.todos.items, filter: s.todos.filter }));',
        why: 'Returns a new object every time, so the component re-renders on every action (React Redux warns in development). Select separately or use `createSelector`.',
      },
    ],
    edgeCases: [
      'A title containing "fail" makes the mock return 500: the thunk rejects with the server message, the listener shows it, the input keeps the text.',
      'Toggling is client-only state in this demo; a real app would PATCH and reconcile.',
    ],
    testing:
      'The demo test (MSW) loads todos, adds one through the thunk, checks the listener notification and audit log, the rejection path and a failed load. Each render gets its own store.',
    production: [
      'Prefer RTK Query for server data to avoid hand-written loading flags.',
      'Keep non-serialisable values (class instances, promises) out of state; the default middleware warns in development.',
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'zustand',
    title: 'Zustand',
    section: 'state',
    category: LIBRARIES,
    level: 'intermediate',
    summary:
      'A store with state and actions, selectors, `useShallow`, and `persist` + `devtools` middleware — one store per mount.',
    tags: ['zustand', 'store', 'selectors', 'useShallow', 'persist', 'devtools', 'createStore'],
    demo: `${EXAMPLES}/zustand/ZustandDemo.tsx`,
    sources: [`${EXAMPLES}/zustand/ZustandDemo.tsx`, `${EXAMPLES}/zustand/shopStore.ts`],
    tests: [`${EXAMPLES}/zustand/ZustandDemo.test.tsx`],
    minReact: '18.0',
    support: {
      level: 'client-only',
      notes:
        'The `persist` middleware reads localStorage when the store is created; for SSR use `skipHydration` and rehydrate on the client.',
    },
    officialDocs: [
      { label: 'Zustand documentation', url: 'https://zustand.docs.pmnd.rs/' },
      {
        label: 'Zustand: comparison',
        url: 'https://zustand.docs.pmnd.rs/learn/getting-started/comparison',
      },
    ],
    related: ['redux-toolkit', 'jotai', 'external-reducer-store'],
    concept:
      'A Zustand store holds state and the actions that change it (`set` merges partial state). Components read it with a selector — `useStore(store, (s) => s.lines)` — and re-render only when the selected value changes. `useShallow` lets a selector return an object compared field by field.',
    problem:
      'Shared client state without providers per slice, reducers or action types. The demo uses `createStore` (vanilla) + context instead of the global `create` hook so each mount and test has its own store.',
    whenToUse: [
      'Shared client state with little boilerplate: carts, editors, UI preferences.',
      'Stores that non-React code must read or update (`store.getState()`, `store.setState`).',
    ],
    whenNotToUse: [
      'Server data: use a query cache.',
      'Teams that want enforced action conventions and an action log by default: Redux Toolkit.',
    ],
    execution: [
      'Mount: `useState(createShopStore)` creates the store; `persist` hydrates synchronously from localStorage.',
      'Click: an action calls `set(updater, undefined, "shop/add")`; the third argument names the action for Redux DevTools (a no-op without the extension).',
      'Subscribers compare their selected value; `ProductList` selects only the `add` function, which never changes, so it never re-renders.',
      '`persist` writes `{ state, version }` with only the `partialize`d fields after each change.',
    ],
    mistakes: [
      {
        title: 'Selector returning a new object without useShallow',
        wrong: 'const { items, total } = useShop((s) => ({ items: count(s), total: sum(s) }));',
        why: 'A new object on every store change makes the component re-render on *every* change (and in Zustand 5 an always-new selector result can trigger a "Maximum update depth" loop).',
        right:
          'const { items, total } = useShop(useShallow((s) => ({ items: count(s), total: sum(s) })));',
      },
      {
        title: 'Subscribing to the whole store',
        wrong: 'const state = useShop((s) => s);',
        why: 'The component re-renders on every change. Select the smallest slice you need.',
      },
    ],
    edgeCases: [
      'Persisted data is versioned (`version: 1`); add `migrate` when the shape changes.',
      'Functions are never persisted (`partialize` keeps only data).',
    ],
    testing:
      'The demo test checks selected re-renders with `<RenderCount>`, coupons, persistence to localStorage and rehydration into a fresh store after remount.',
    production: [
      'Keep the global `create` hook for app singletons; use `createStore` + context for per-instance or per-request stores (SSR).',
      'Validate or migrate persisted state; storage is user-editable.',
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'jotai',
    title: 'Jotai',
    section: 'state',
    category: LIBRARIES,
    level: 'intermediate',
    summary:
      'Primitive, derived, async and write-only atoms (Jotai 3), with Suspense for an async profile atom.',
    tags: ['jotai', 'atoms', 'derived state', 'async atom', 'suspense', 'unwrap', 'provider'],
    demo: `${EXAMPLES}/jotai/JotaiDemo.tsx`,
    sources: [`${EXAMPLES}/jotai/JotaiDemo.tsx`, `${EXAMPLES}/jotai/usersAtoms.ts`],
    tests: [`${EXAMPLES}/jotai/JotaiDemo.test.tsx`],
    minReact: '18.0',
    support: {
      level: 'universal',
      notes:
        'Jotai uses `React.use` for async atoms when available (React 19) and a shim otherwise.',
    },
    officialDocs: [
      { label: 'Jotai documentation', url: 'https://jotai.org/docs' },
      { label: 'Suspense', url: 'https://react.dev/reference/react/Suspense' },
    ],
    related: ['zustand', 'tanstack-query', 'state-management-comparison'],
    concept:
      'An atom is a piece of state defined at module level; its *value* lives in a store (a `<Provider>` or the default store). Derived atoms read other atoms with `get` and recompute only when those change. Async atoms return promises: `useAtomValue` suspends until they resolve. Write-only atoms (`atom(null, (get, set, arg) => ...)`) act as actions.',
    problem:
      'Many small, interdependent pieces of state (filters, selection, derived lists) are awkward in one big store and cause wide re-renders in context. Atoms subscribe each component to exactly what it reads.',
    whenToUse: [
      'Bottom-up state: many independent values plus derived values.',
      'Async values that fit Suspense (a profile for the selected id).',
    ],
    whenNotToUse: [
      'Server data that needs caching, refetching and mutations: a query cache does more (Jotai has integrations, e.g. jotai-tanstack-query).',
      'When you want a single action log of every change: Redux Toolkit.',
    ],
    execution: [
      'Mount: `<Provider>` creates a fresh store for this demo; atom configs are shared, values are not.',
      'First read of `usersAtom` starts the fetch (with an `AbortSignal`); `unwrap` exposes it synchronously (`null` while pending) so filtering never suspends.',
      'Typing updates `searchAtom`; `visibleUsersAtom` recomputes because it read `searchAtom`.',
      'Selecting a user changes `selectedUserIdAtom`; `selectedUserAtom` returns a new promise and the profile `<Suspense>` shows its fallback until it resolves. The previous request is aborted.',
    ],
    mistakes: [
      {
        title: 'Creating atoms during render',
        wrong:
          "function Search() {\n  const queryAtom = atom(''); // new atom every render\n  const [q, setQ] = useAtom(queryAtom);\n}",
        why: 'Each render creates a new atom, so the value resets. Define atoms at module level (or memoise them).',
      },
      {
        title: 'Async derived atoms for keystroke-driven lists',
        wrong:
          'const visible = atom(async (get) => filter(await get(usersAtom), get(searchAtom)));',
        why: 'Every keystroke returns a new promise and the list suspends (fallback flashes). Use `unwrap` or keep the derivation synchronous.',
      },
    ],
    edgeCases: [
      'Jotai 3 removed `loadable` from `jotai/utils`; `unwrap` is the replacement used here.',
      'Request failures are returned as values (`{ ok: false, error }`) so they render without an error boundary.',
    ],
    testing:
      'The demo test filters with derived atoms and waits for the Suspense profile. React 19 requires the interaction that suspends to run in an awaited `act()`; the test does that explicitly. MSW overrides cover the error path.',
    production: [
      'Scope providers per feature or per request (SSR) to avoid sharing the default store.',
      'Use `debugLabel` on atoms for clearer DevTools output.',
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'tanstack-query',
    title: 'TanStack Query (server state)',
    section: 'state',
    category: LIBRARIES,
    level: 'intermediate',
    summary:
      '`useQuery` + `useMutation` against /api/todos with an optimistic add, rollback on error and invalidation.',
    tags: [
      'tanstack query',
      'react query',
      'server state',
      'useQuery',
      'useMutation',
      'optimistic update',
      'cache',
      'invalidation',
    ],
    demo: `${EXAMPLES}/tanstack-query/TanStackQueryDemo.tsx`,
    sources: [`${EXAMPLES}/tanstack-query/TanStackQueryDemo.tsx`, `${EXAMPLES}/shared/todosApi.ts`],
    tests: [`${EXAMPLES}/tanstack-query/TanStackQueryDemo.test.tsx`],
    minReact: '18.0',
    support: { level: 'universal' },
    officialDocs: [
      {
        label: 'TanStack Query: optimistic updates',
        url: 'https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates',
      },
      {
        label: 'TanStack Query: testing',
        url: 'https://tanstack.com/query/latest/docs/framework/react/guides/testing',
      },
    ],
    related: ['swr', 'redux-toolkit', 'testing-network-msw', 'state-management-comparison'],
    concept:
      'Server state is a cache of data owned by the server. `useQuery({ queryKey, queryFn })` fetches, caches, dedupes and refetches it; `useMutation` changes it. The optimistic pattern: `onMutate` cancels in-flight queries, snapshots the cache and writes the expected result; `onError` restores the snapshot; `onSettled` invalidates so the cache re-syncs with the server.',
    problem:
      'Hand-written fetching in effects or thunks re-implements loading/error flags, caching, race handling, retries and refetching. Putting server data in a client store also makes it stale by default.',
    whenToUse: [
      'Any data that lives on a server: lists, details, search results.',
      'Mutations with immediate feedback (optimistic UI) and reliable rollback.',
    ],
    whenNotToUse: [
      'Client-only UI state (open dialogs, drafts): `useState`, context or a client store.',
      'If you already use Redux Toolkit everywhere, RTK Query offers the same model inside the store.',
    ],
    execution: [
      'Mount: one `QueryClient` per demo (in `useState`), so cache never leaks between mounts or tests.',
      '`useQuery` fetches `["todos"]` with the query’s `AbortSignal`; `staleTime` keeps it fresh for 10 s.',
      'Submit: `onMutate` runs before the request and inserts a temporary todo marked "saving…"; its return value is passed to `onError`.',
      'Failure ("fail" in the title → 500): `onError` restores the snapshot and shows why; success clears the input.',
      'Either way `onSettled` invalidates `["todos"]`, refetching the server’s truth.',
    ],
    mistakes: [
      {
        title: 'A QueryClient at module level in tests',
        wrong:
          'const queryClient = new QueryClient();\nit("…", () => render(<QueryClientProvider client={queryClient}>…))',
        why: 'The cache is shared between tests, so one test’s data appears in the next. Create a client per test (or per mount) and disable retries.',
      },
      {
        title: 'Forgetting cancelQueries in onMutate',
        wrong: 'onMutate: (title) => { queryClient.setQueryData(key, (old) => [...old, temp]); }',
        why: 'A refetch already in flight can resolve after the optimistic write and overwrite it, making the new item flicker away.',
      },
    ],
    edgeCases: [
      'Default retries are 3 with exponential back-off; the demo disables them so failures show immediately (and tests stay fast).',
      'A simpler v5 alternative for single-component optimism is rendering `mutation.variables` while `isPending`, without touching the cache.',
    ],
    testing:
      'MSW serves /api/todos. Tests assert the optimistic item appears before the 400 ms POST resolves, stays after success, and is rolled back with the server message for "fail" titles; a query failure is requested exactly once (no retries).',
    production: [
      'Use query key factories and invalidate by prefix.',
      'Set `staleTime` deliberately; the default of 0 refetches on every mount and window focus.',
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'swr',
    title: 'SWR (stale-while-revalidate)',
    section: 'state',
    category: LIBRARIES,
    level: 'intermediate',
    summary:
      '`useSWR` keyed by URL plus an optimistic PATCH with `mutate`, `optimisticData`, `populateCache` and `rollbackOnError`.',
    tags: [
      'swr',
      'useSWR',
      'mutate',
      'optimistic',
      'revalidation',
      'cache provider',
      'server state',
    ],
    demo: `${EXAMPLES}/swr/SwrDemo.tsx`,
    sources: [`${EXAMPLES}/swr/SwrDemo.tsx`, `${EXAMPLES}/shared/todosApi.ts`],
    tests: [`${EXAMPLES}/swr/SwrDemo.test.tsx`],
    minReact: '16.11',
    support: { level: 'universal' },
    officialDocs: [
      { label: 'SWR: mutation', url: 'https://swr.vercel.app/docs/mutation' },
      { label: 'SWR: cache providers', url: 'https://swr.vercel.app/docs/advanced/cache' },
    ],
    related: ['tanstack-query', 'testing-network-msw'],
    concept:
      'SWR returns cached data immediately (stale), then revalidates in the background. The key (here the URL) identifies the cache entry. `mutate(key, promise, options)` applies `optimisticData` at once, writes the server response into the cache with `populateCache`, and restores the previous data on failure with `rollbackOnError`.',
    problem:
      'Remote data needs caching, deduplication and revalidation on focus/reconnect; toggles should feel instant but must roll back when the server says no.',
    whenToUse: [
      'Read-heavy remote data with a small API surface.',
      'Simple optimistic mutations keyed by URL.',
    ],
    whenNotToUse: [
      'Complex mutation workflows, dependent queries and fine-grained cache control: TanStack Query has a richer API.',
      'Client-only state.',
    ],
    execution: [
      '`<SWRConfig value={{ provider: () => new Map() }}>` gives this demo its own cache (also the recommended test isolation).',
      'Toggle: the checkbox flips immediately via `optimisticData`; the PATCH runs; `populateCache` merges the returned todo; `revalidate: false` skips a refetch.',
      'With "Simulate server failure" the PATCH returns 500; SWR restores the previous list and `mutate` rejects, which the demo shows.',
    ],
    mistakes: [
      {
        title: 'Sharing the global cache between tests',
        wrong: 'render(<TodosWithSwr />); // uses the default global cache',
        why: 'Data from a previous test is returned instantly. Wrap each render in `SWRConfig` with `provider: () => new Map()`.',
      },
      {
        title: 'Optimistic data without rollback',
        wrong: 'mutate(key, update(), { optimisticData: next, rollbackOnError: false })',
        why: 'A failed request leaves the UI showing a change the server rejected.',
      },
    ],
    edgeCases: [
      'Error retries are on by default (exponential back-off); the demo sets `shouldRetryOnError: false`.',
      '`mutate` throws on error by default (`throwOnError`), so wrap it in try/catch to show a message.',
    ],
    testing:
      'Tests assert the checkbox flips before the PATCH resolves, the PATCH body, rollback on a 500, and that each mount has an isolated cache.',
    production: [
      'Prefer `useSWRMutation` for mutations that are not tied to an existing key.',
      'Configure `dedupingInterval` and focus revalidation per screen.',
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'rxjs-observable-store',
    title: 'RxJS observable store',
    section: 'state',
    category: LIBRARIES,
    level: 'advanced',
    summary:
      'A BehaviorSubject store read with `useSyncExternalStore`, and a debounced, cancellable search pipeline.',
    tags: [
      'rxjs',
      'observable',
      'BehaviorSubject',
      'debounceTime',
      'switchMap',
      'fromFetch',
      'streams',
      'useSyncExternalStore',
    ],
    demo: `${EXAMPLES}/rxjs/RxjsDemo.tsx`,
    sources: [
      `${EXAMPLES}/rxjs/RxjsDemo.tsx`,
      `${EXAMPLES}/rxjs/searchModel.ts`,
      `${EXAMPLES}/rxjs/useObservableValue.ts`,
    ],
    tests: [`${EXAMPLES}/rxjs/RxjsDemo.test.tsx`],
    minReact: '18.0',
    support: { level: 'universal' },
    officialDocs: [
      { label: 'RxJS: BehaviorSubject', url: 'https://rxjs.dev/api/index/class/BehaviorSubject' },
      { label: 'RxJS: switchMap', url: 'https://rxjs.dev/api/operators/switchMap' },
      { label: 'RxJS: fromFetch', url: 'https://rxjs.dev/api/fetch/fromFetch' },
      USE_SYNC_EXTERNAL_STORE_DOCS,
    ],
    related: ['external-reducer-store', 'state-management-comparison'],
    concept:
      'A `BehaviorSubject` always has a current value (`getValue()`) and notifies subscribers, which is exactly the shape `useSyncExternalStore` needs. User intent flows into a `Subject`; operators (`debounceTime`, `distinctUntilChanged`, `switchMap(fromFetch)`) describe timing and cancellation declaratively.',
    problem:
      'Debouncing, de-duplicating and cancelling stale requests by hand needs timers, flags and abort controllers spread over effects. The original repository used RxJS in `src/esp-demo/common/hooks/useStream.ts`, but kept subscriptions in a module-level array that was never cleaned up per stream (its own TODO). Here one subscription is returned by `connect()` and closed on unmount, and `switchMap` aborts the previous request.',
    whenToUse: [
      'Event streams with timing rules: search-as-you-type, drag, live feeds, polling with back-off.',
      'Combining several async sources (`combineLatest`, `merge`).',
    ],
    whenNotToUse: [
      'Plain state: a reducer or store is simpler and familiar to more developers.',
      'Server caching: TanStack Query or SWR.',
    ],
    api: {
      signature:
        'function useObservableValue<T>(source: { getValue(): T; subscribe(next: (value: T) => void): { unsubscribe(): void } }): T',
      params: [
        {
          name: 'source',
          type: 'ValueSource<T>',
          description:
            'Any BehaviorSubject-like object. Typed structurally so the hook itself does not import RxJS. Keep it stable (create it once).',
        },
      ],
      returns: 'The current value; the component re-renders when the subject emits a new value.',
    },
    execution: [
      'Mount: the model is created once (`useState`); an effect calls `connect()` and returns `unsubscribe` as cleanup.',
      'Typing: `setQuery` updates `query` in the state subject at once (the input stays responsive) and pushes the query into the intent stream.',
      'After 300 ms of quiet, a changed query starts `fromFetch`; a newer query makes `switchMap` unsubscribe, which aborts the old request.',
      'Each emission merges a patch into the BehaviorSubject; `useSyncExternalStore` re-reads `getValue()`.',
    ],
    mistakes: [
      {
        title: 'Subscribing in render or without cleanup',
        wrong:
          'function Search() {\n  results$.subscribe(setResults); // every render, never unsubscribed\n}',
        why: 'Each render adds a subscription that keeps running after unmount — the leak the original `useStream` documented.',
        right:
          'useEffect(() => {\n  const subscription = model.connect();\n  return () => subscription.unsubscribe();\n}, [model]);',
      },
      {
        title: 'mergeMap instead of switchMap for search',
        wrong: 'query$.pipe(mergeMap((q) => fromFetch(url(q))))',
        why: 'Every request stays alive and responses can arrive out of order, showing results for an older query.',
      },
    ],
    edgeCases: [
      'Unmounting during the debounce window sends no request (tested by counting MSW requests).',
      'Clearing the input returns to `idle` without a request.',
    ],
    testing:
      'Tests type quickly and assert a single request and the results, an error followed by recovery, and that unmounting within the debounce window sends nothing.',
    production: [
      'Expose read-only views (`getValue`/`subscribe`) to React and keep `next` inside the model.',
      'Prefer `useSyncExternalStore` over `useEffect` + `setState` mirrors to avoid tearing.',
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'state-management-comparison',
    title: 'Choosing a state approach',
    section: 'state',
    category: LIBRARIES,
    level: 'intermediate',
    summary:
      'React hooks vs event middleware vs reducer middleware vs external stores vs Redux, Zustand, Jotai and server-state caches.',
    tags: [
      'comparison',
      'architecture',
      'redux',
      'zustand',
      'jotai',
      'tanstack query',
      'swr',
      'esp-js',
      'decision',
    ],
    demo: `${EXAMPLES}/comparison/StateManagementComparisonDemo.tsx`,
    sources: [
      `${EXAMPLES}/comparison/StateManagementComparisonDemo.tsx`,
      `${EXAMPLES}/comparison/comparisonData.ts`,
    ],
    tests: [`${EXAMPLES}/comparison/StateManagementComparisonDemo.test.tsx`],
    minReact: '16.8',
    support: { level: 'universal' },
    officialDocs: [
      {
        label: 'Choosing the state structure',
        url: 'https://react.dev/learn/choosing-the-state-structure',
      },
      {
        label: 'Scaling up with reducer and context',
        url: 'https://react.dev/learn/scaling-up-with-reducer-and-context',
      },
    ],
    related: [
      'esp-middleware-overview',
      'usestate-vs-usereducer',
      'context-reducer-split',
      'reducer-middleware-pipeline',
      'external-reducer-store',
      'redux-toolkit',
      'zustand',
      'jotai',
      'tanstack-query',
      'swr',
      'rxjs-observable-store',
    ],
    concept:
      'First separate **server state** (owned by a backend: cache it with TanStack Query, SWR or RTK Query) from **client state** (owned by the UI). For client state, pick the smallest tool that covers who needs the state, how often it changes and whether updates need cross-cutting behaviour.',
    problem:
      'Teams often adopt one global store for everything, then fight stale server data and wide re-renders — or avoid stores and drown in prop drilling and effect-synchronised copies. The trade-offs are concrete and can be compared.',
    whenToUse: [
      '**useState / useReducer**: state owned by one component or a small subtree.',
      '**Context + reducer**: low-frequency shared values (theme, auth, locale) and dependency injection; split state and dispatch.',
      '**Reducer middleware** (this repo): logging, validation, analytics, persistence or async around a reducer without a library.',
      '**Event middleware (esp-js)**: event-heavy domains where many models observe and process the same events in stages; the original example of this repository (see the ESP-JS section, entry `esp-middleware-overview`).',
      '**External store + useSyncExternalStore**: state produced outside React (sockets, browser APIs, legacy stores) with selector-level re-renders.',
      '**Redux Toolkit**: large apps and teams that value explicit actions, DevTools and conventions.',
      '**Zustand**: shared client state with minimal boilerplate. **Jotai**: many small interdependent atoms and derived values, Suspense-friendly.',
      '**RxJS**: time-based stream processing (debounce, cancel, combine).',
    ],
    whenNotToUse: [
      'Do not put server data in a client store just to share it: a query cache shares it and keeps it fresh.',
      'Do not add a library for state that one component owns.',
      'Do not use context for rapidly changing values read by many components: it has no selectors.',
      'Do not mix several global client stores for the same domain; pick one per app where possible.',
    ],
    execution: [
      'Who reads it? One component → local state. A subtree → context or a store. Code outside React → an external store.',
      'How often does it change? Rarely → context is fine. Often and widely read → a store with selectors (Redux, Zustand, Jotai, `useSyncExternalStore`).',
      'Does every update need the same side effects? → middleware (reducer middleware, Redux middleware/listeners, Zustand middleware).',
      'Is it really a copy of server data? → TanStack Query / SWR / RTK Query.',
    ],
    edgeCases: [
      'All of Redux, Zustand and the reducer store here subscribe through `useSyncExternalStore`, so they are safe under concurrent rendering; context is also concurrent-safe but re-renders every consumer.',
      'Event middleware and reducer middleware compose: in this repository the esp-js router is bridged into a reducer store through one middleware.',
    ],
    testing:
      'The demo test checks that the table lists every approach and that each need maps to at least one row. Each approach has its own demo and tests in this section.',
    production: [
      'Write the decision down (an ADR) and keep server state and client state in separate tools.',
      'Measure before optimising re-renders: the React DevTools Profiler shows what actually re-renders.',
    ],
  },
];
