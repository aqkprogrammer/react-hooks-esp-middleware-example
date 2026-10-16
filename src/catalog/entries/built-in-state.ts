import type { CatalogEntry, DocLink } from '../types';

const USE_STATE_DOCS: DocLink = {
  label: 'useState',
  url: 'https://react.dev/reference/react/useState',
};
const USE_REDUCER_DOCS: DocLink = {
  label: 'useReducer',
  url: 'https://react.dev/reference/react/useReducer',
};
const USE_CONTEXT_DOCS: DocLink = {
  label: 'useContext',
  url: 'https://react.dev/reference/react/useContext',
};

const DIR = 'examples/built-in/state';

export const entries: CatalogEntry[] = [
  {
    id: 'use-state-fundamentals',
    title: 'useState — fundamentals, batching & lazy init',
    section: 'built-in',
    category: 'State & context',
    level: 'beginner',
    summary:
      'Primitive and object state, functional updates under batching, and lazy initialisation.',
    tags: ['useState', 'state', 'batching', 'updater function', 'lazy initializer', 'basics'],
    demo: `${DIR}/UseStateBasicsDemo.tsx`,
    sources: [`${DIR}/UseStateBasicsDemo.tsx`],
    tests: [`${DIR}/UseStateBasicsDemo.test.tsx`],
    minReact: '16.8',
    support: { level: 'universal' },
    officialDocs: [
      USE_STATE_DOCS,
      {
        label: 'Queueing a series of state updates',
        url: 'https://react.dev/learn/queueing-a-series-of-state-updates',
      },
    ],
    related: [
      'use-state-immutable-updates',
      'use-state-derived-state',
      'use-reducer',
      'use-local-storage',
    ],
    concept:
      '`useState` gives a component a value that survives re-renders and a setter that schedules a re-render with a new value. Each render sees a *snapshot*: `count` is a constant inside that render.',
    problem:
      'Local variables reset on every render and changing them does not update the screen. State is the memory React keeps for a component between renders.',
    whenToUse: [
      'Independent UI values: an input, a toggle, the selected tab, a counter.',
      'Values the next render must show; anything else (timer ids, DOM nodes) belongs in a ref.',
    ],
    whenNotToUse: [
      'Values computed from props or other state — compute them during render.',
      'Several values that always change together or complex transitions — prefer `useReducer`.',
      'Server data — prefer a data-fetching cache (TanStack Query, SWR) over `useState` + effects.',
    ],
    api: {
      signature:
        'function useState<S>(initialState: S | (() => S)): [S, Dispatch<SetStateAction<S>>]',
      params: [
        {
          name: 'initialState',
          type: 'S | (() => S)',
          description:
            'Used on the first render only. Pass a function to compute it lazily (called once on mount, twice in Strict Mode development).',
        },
      ],
      returns:
        'A tuple: the current state and a stable `setState(next | (previous) => next)` function. The setter identity never changes, so it is safe to omit from dependency arrays.',
    },
    execution: [
      'Render: React returns the current state for this hook slot (by call order).',
      '`setState(value)` queues an update; `setState(fn)` queues an updater that receives the pending state.',
      'All updates from one event (and, since React 18, from timeouts and promises too) are batched into a single re-render.',
      'If the new state is `Object.is`-equal to the current one, React may skip re-rendering children.',
    ],
    mistakes: [
      {
        title: 'Calling the setter several times with the same snapshot',
        wrong: 'setCount(count + 1);\nsetCount(count + 1); // still count + 1',
        why: '`count` is the value from this render. Both calls ask for the same result.',
        right: 'setCount((c) => c + 1);\nsetCount((c) => c + 1); // +2',
      },
      {
        title: 'Running an expensive initialiser on every render',
        wrong: 'const [todos, setTodos] = useState(createInitialTodos());',
        why: '`createInitialTodos()` runs on every render; React ignores the result after the first.',
        right: 'const [todos, setTodos] = useState(createInitialTodos);',
      },
      {
        title: 'Reading state right after setting it',
        wrong: 'setCount(count + 1);\nconsole.log(count); // old value',
        why: 'The setter does not change the variable in the running render; it schedules the next one.',
        right: 'const next = count + 1;\nsetCount(next);\nconsole.log(next);',
      },
    ],
    edgeCases: [
      'Storing a function in state needs a wrapper: `setFn(() => myFn)`, otherwise React calls it as an updater.',
      "Changing a component's `key` resets its state — the demo uses this to re-run the lazy initialiser.",
      'Updaters must be pure: Strict Mode calls them twice in development.',
    ],
    testing:
      'The demo test clicks the stale and updater buttons and asserts +1 vs +3, edits object state, and remounts the editor to verify the lazy initialiser reads the saved draft.',
    production: [
      'Keep state minimal and close to where it is used; derive the rest.',
      'Guard storage access in initialisers with try/catch — it throws when storage is blocked.',
    ],
  },
  {
    id: 'use-state-immutable-updates',
    title: 'useState — immutable updates for arrays & objects',
    section: 'built-in',
    category: 'State & context',
    level: 'beginner',
    summary:
      'Add, toggle, remove, reorder and sort arrays and update nested objects without mutation — and see why mutation fails.',
    tags: ['immutability', 'arrays', 'nested objects', 'spread', 'toSorted', 'mutation bug'],
    demo: `${DIR}/UseStateImmutableUpdatesDemo.tsx`,
    sources: [`${DIR}/UseStateImmutableUpdatesDemo.tsx`],
    tests: [`${DIR}/UseStateImmutableUpdatesDemo.test.tsx`],
    minReact: '16.8',
    support: { level: 'universal' },
    officialDocs: [
      {
        label: 'Updating arrays in state',
        url: 'https://react.dev/learn/updating-arrays-in-state',
      },
      {
        label: 'Updating objects in state',
        url: 'https://react.dev/learn/updating-objects-in-state',
      },
    ],
    related: ['use-state-fundamentals', 'use-reducer'],
    concept:
      'Treat state as read-only: build a new array/object for every change and pass it to the setter. Copy each level on the path to the changed field; untouched branches keep their identity.',
    problem:
      'React detects changes by reference (`Object.is`). Mutating an array and passing the same reference back does not re-render, and memoised children may show stale data indefinitely.',
    whenToUse: [
      'Any state that holds arrays or objects.',
      'Use non-mutating helpers: spread, `map`, `filter`, `slice`, `toSorted`, `toReversed`, `with`.',
    ],
    whenNotToUse: [
      'Deeply nested, frequently edited data — flatten it, move it to `useReducer`, or use Immer (`produce`) to write "mutating" code that yields new objects.',
    ],
    api: {
      signature: 'setItems((previous) => [...previous, item]); // never previous.push(item)',
    },
    execution: [
      'The handler builds a new value from the previous one (updater form avoids stale reads).',
      'React compares the new value with the old one by reference and re-renders when they differ.',
      'Children receiving unchanged branches get the same references, so `memo` can skip them.',
    ],
    mistakes: [
      {
        title: 'Mutating then setting the same array',
        wrong: 'items.push(newItem);\nsetItems(items);',
        why: 'Same reference → React bails out. The demo shows the change appearing only after an unrelated re-render.',
        right: 'setItems((previous) => [...previous, newItem]);',
      },
      {
        title: 'Shallow copy of a nested object',
        wrong:
          'const next = { ...settings };\nnext.profile.address.city = city; // mutates shared nested objects\nsetSettings(next);',
        why: 'Spread copies one level. `profile` and `address` are still the old objects, now mutated.',
        right:
          'setSettings((s) => ({\n  ...s,\n  profile: { ...s.profile, address: { ...s.profile.address, city } },\n}));',
      },
      {
        title: 'Sorting in place',
        wrong: 'setItems(items.sort(compare));',
        why: '`sort` mutates and returns the same array.',
        right: 'setItems((previous) => previous.toSorted(compare));',
      },
    ],
    edgeCases: [
      'Read event values before calling an updater (`const city = event.target.value`) — updaters may run later.',
      'Generate ids in the event handler (a ref counter or `crypto.randomUUID()`), never during render.',
    ],
    testing:
      'The demo test adds, toggles, reorders, sorts and deletes tasks, asserts a nested update keeps sibling fields, and shows the mutation bug only rendering after a forced re-render.',
    production: [
      'The React Compiler and `memo` rely on immutability; mutation silently breaks both.',
      'Immer is a good fit when update code becomes deeply nested spreads.',
    ],
  },
  {
    id: 'use-state-derived-state',
    title: 'useState — derived vs duplicated state',
    section: 'built-in',
    category: 'State & context',
    level: 'intermediate',
    summary:
      'A copied selection and a stored total drift out of sync; storing an id and deriving the rest fixes both.',
    tags: ['derived state', 'single source of truth', 'redundant state', 'state structure'],
    demo: `${DIR}/UseStateDerivedStateDemo.tsx`,
    sources: [`${DIR}/UseStateDerivedStateDemo.tsx`],
    tests: [`${DIR}/UseStateDerivedStateDemo.test.tsx`],
    minReact: '16.8',
    support: { level: 'universal' },
    officialDocs: [
      {
        label: 'Choosing the state structure',
        url: 'https://react.dev/learn/choosing-the-state-structure',
      },
      USE_STATE_DOCS,
    ],
    related: ['use-state-colocation', 'you-might-not-need-an-effect', 'use-state-fundamentals'],
    concept:
      'Keep the *minimal* state and compute everything else during render. Store `selectedId`, not a copy of the selected object; compute totals and filtered lists from the source array.',
    problem:
      'Duplicated state has to be updated in every code path that changes the original. Miss one and the UI shows contradictory data — the demo renames an item but the "selected" label keeps the old name.',
    whenToUse: [
      'Whenever a value can be computed from props or other state.',
      'Selections: store ids/indexes; look the object up during render.',
    ],
    whenNotToUse: [
      'Intentionally frozen snapshots (an "initial value" prop, a form\'s original values for a reset) — name them `initialX` to make that explicit.',
    ],
    api: {
      signature: 'const selected = items.find((item) => item.id === selectedId); // derived',
    },
    execution: [
      'Render reads the source state (`items`, `selectedId`).',
      'Derived values are plain expressions in the component body, recomputed every render.',
      'Only if profiling shows a cost, wrap the computation in `useMemo`.',
    ],
    mistakes: [
      {
        title: 'Copying an item into state',
        wrong: 'const [selectedItem, setSelectedItem] = useState(items[0]);',
        why: 'Editing `items` does not update the copy, so the selection shows stale data.',
        right:
          'const [selectedId, setSelectedId] = useState(items[0].id);\nconst selectedItem = items.find((item) => item.id === selectedId);',
      },
      {
        title: 'Syncing derived values with an effect',
        wrong:
          'useEffect(() => {\n  setTotal(items.reduce((sum, i) => sum + i.price, 0));\n}, [items]);',
        why: 'Renders once with a stale total, then again with the right one — and is easy to forget.',
        right: 'const total = items.reduce((sum, i) => sum + i.price, 0);',
      },
    ],
    edgeCases: [
      'When the selected item is deleted, the derived lookup returns `undefined` — handle it in render instead of resetting state in an effect.',
    ],
    testing:
      'The demo test renames the selected item and changes a price in both panels, asserting the duplicated panel is stale while the derived panel is correct.',
    production: [
      'Normalise collections (`byId` + `ids`) when many places select by id.',
      'For expensive derivations, `useMemo` (or the React Compiler) caches without duplicating state.',
    ],
  },
  {
    id: 'use-state-colocation',
    title: 'useState — state colocation',
    section: 'built-in',
    category: 'State & context',
    level: 'intermediate',
    summary:
      'Keep state in the lowest component that needs it; lifting it too high re-renders unrelated siblings.',
    tags: ['colocation', 'lifting state up', 'performance', 'render count'],
    demo: `${DIR}/UseStateColocationDemo.tsx`,
    sources: [`${DIR}/UseStateColocationDemo.tsx`],
    tests: [`${DIR}/UseStateColocationDemo.test.tsx`],
    minReact: '16.8',
    support: { level: 'universal' },
    officialDocs: [
      {
        label: 'Sharing state between components',
        url: 'https://react.dev/learn/sharing-state-between-components',
      },
      USE_STATE_DOCS,
    ],
    related: ['use-state-derived-state', 'use-context-performance'],
    concept:
      'State lives in the component that owns it. Lift it to the closest common parent only when two components need the same value — and no further.',
    problem:
      'When a page component owns the text of one filter input, every keystroke re-renders the whole page, including expensive siblings that never read it.',
    whenToUse: [
      'Default placement for any new state: start local, lift when sharing becomes necessary.',
    ],
    whenNotToUse: [
      'State that several distant components read — lift it, or use context / an external store.',
    ],
    api: { signature: 'function Filter() { const [query, setQuery] = useState(""); /* … */ }' },
    execution: [
      'A state update re-renders the owning component and its descendants.',
      'Moving the state down shrinks that subtree, so siblings are untouched.',
    ],
    mistakes: [
      {
        title: 'Lifting state "just in case"',
        wrong:
          'function Page() {\n  const [query, setQuery] = useState("");\n  return <><Filter query={query} onChange={setQuery} /><ExpensiveChart /></>;\n}',
        why: '`ExpensiveChart` re-renders on every keystroke although it never uses `query`.',
        right:
          'function Page() {\n  return <><Filter /><ExpensiveChart /></>;\n}\nfunction Filter() {\n  const [query, setQuery] = useState("");\n  // …\n}',
      },
    ],
    edgeCases: [
      "Passing expensive parts as `children` from above is another way to keep them out of a stateful component's render.",
    ],
    testing:
      'The demo test types into both filters and asserts the lifted sibling commits once per keystroke while the colocated sibling commits once in total (measured with `<Profiler>` via RenderCount).',
    production: [
      'Colocate first, then measure with the React DevTools Profiler before adding `memo`.',
    ],
  },
  {
    id: 'use-reducer',
    title: 'useReducer — typed actions, lazy init & undo',
    section: 'built-in',
    category: 'State & context',
    level: 'intermediate',
    summary:
      'A pure, testable reducer with a discriminated-union action type, an exhaustive `never` check and lazy initialisation.',
    tags: [
      'useReducer',
      'reducer',
      'dispatch',
      'discriminated union',
      'exhaustive check',
      'never',
      'undo',
      'typescript',
    ],
    demo: `${DIR}/UseReducerDemo.tsx`,
    sources: [`${DIR}/tasksReducer.ts`, `${DIR}/UseReducerDemo.tsx`],
    tests: [`${DIR}/tasksReducer.test.ts`, `${DIR}/UseReducerDemo.test.tsx`],
    minReact: '16.8',
    support: { level: 'universal' },
    officialDocs: [
      USE_REDUCER_DOCS,
      {
        label: 'Extracting state logic into a reducer',
        url: 'https://react.dev/learn/extracting-state-logic-into-a-reducer',
      },
    ],
    related: ['use-state-fundamentals', 'use-state-immutable-updates', 'use-context-performance'],
    concept:
      'Components describe *what happened* by dispatching actions; a pure `reducer(state, action)` decides the next state. TypeScript narrows each `case` by `action.type`, and assigning the leftover action to `never` makes unhandled actions a compile error.',
    problem:
      'When many handlers update several related values, the update logic is spread across the component, hard to test and easy to get inconsistent. A reducer centralises it in one pure function.',
    whenToUse: [
      'Several values that change together (items + filter + undo history).',
      'Next state depends on the previous state in non-trivial ways.',
      'You want to unit-test transitions without rendering, or log every action.',
      'Combined with context, dispatch is a stable function you can pass deep without re-renders.',
    ],
    whenNotToUse: [
      'A single independent value — `useState` is shorter.',
      'App-wide state shared by many features with middleware/devtools needs — consider Redux Toolkit or Zustand (see the state-management section).',
    ],
    api: {
      signature:
        'function useReducer<S, A, I>(reducer: (state: S, action: A) => S, initialArg: I, init?: (arg: I) => S): [S, Dispatch<A>]',
      params: [
        {
          name: 'reducer',
          type: '(state, action) => state',
          description: 'Pure function. No side effects, no mutation.',
        },
        {
          name: 'initialArg',
          type: 'I',
          description: 'Initial state, or the argument passed to `init`.',
        },
        {
          name: 'init',
          type: '(arg: I) => S',
          description: 'Lazy initialiser: `init(initialArg)` runs once on mount.',
          optional: true,
        },
      ],
      returns: 'The current state and a stable `dispatch(action)` function.',
    },
    execution: [
      'Mount: state = `init ? init(initialArg) : initialArg`.',
      '`dispatch(action)` queues the action; during the next render React runs `reducer(state, action)` for each queued action.',
      'If the reducer returns the same state object, React bails out of re-rendering children.',
      'In Strict Mode development the reducer runs twice per action to surface impurity.',
    ],
    mistakes: [
      {
        title: 'Mutating state inside the reducer',
        wrong: "case 'added':\n  state.tasks.push(newTask);\n  return state;",
        why: "Same reference → no re-render, and Strict Mode's double call adds the task twice.",
        right: "case 'added':\n  return { ...state, tasks: [...state.tasks, newTask] };",
      },
      {
        title: 'No exhaustiveness check',
        wrong: 'default:\n  return state; // a new action type is silently ignored',
        why: 'Adding an action to the union compiles fine even though nothing handles it.',
        right:
          'default: {\n  const unhandled: never = action;\n  throw new Error(`Unhandled action: ${JSON.stringify(unhandled)}`);\n}',
      },
      {
        title: 'Side effects in the reducer',
        wrong: "case 'saved':\n  fetch('/api/save', { method: 'POST' });\n  return state;",
        why: 'Reducers can run more than once (Strict Mode) and must be pure.',
        right: '// Do the request in the event handler, then dispatch the result.',
      },
    ],
    edgeCases: [
      'Return the same object for no-op actions (empty title, unchanged filter) so React can skip the render.',
      'Store derived data (visible tasks, remaining count) nowhere: compute it with selectors in render.',
      '`dispatch` identity is stable — no need to list it in dependency arrays.',
    ],
    testing:
      'The reducer is tested directly (pure function, frozen input, no-op identity, undo, unknown action) and the demo test drives the UI: add, toggle, filter, delete, clear completed and undo, checking the action log.',
    production: [
      'Name actions in past tense (`added`, `toggled`) — they describe events, not commands.',
      "The repository's reducer middleware (`src/middleware/reducer`) adds logging/persistence around a reducer like this one.",
    ],
  },
  {
    id: 'use-context',
    title: 'useContext — shared values, multiple contexts & React 19 providers',
    section: 'built-in',
    category: 'State & context',
    level: 'beginner',
    summary:
      'Provide theme and user to a subtree, compose providers, override a value for a nested subtree, and read context with `use()`.',
    tags: [
      'useContext',
      'context',
      'provider',
      'createContext',
      'use',
      'React 19',
      'prop drilling',
    ],
    demo: `${DIR}/UseContextDemo.tsx`,
    sources: [`${DIR}/UseContextDemo.tsx`],
    tests: [`${DIR}/UseContextDemo.test.tsx`],
    minReact: '19.0',
    support: {
      level: 'universal',
      notes:
        '`useContext` itself works since 16.8; the demo uses React 19 `<Context value>` provider syntax and `use(Context)`.',
    },
    officialDocs: [
      USE_CONTEXT_DOCS,
      { label: 'use', url: 'https://react.dev/reference/react/use' },
      { label: 'createContext', url: 'https://react.dev/reference/react/createContext' },
    ],
    related: ['use-context-performance', 'use-reducer', 'use-sync-external-store'],
    concept:
      "`createContext(default)` creates a channel; a provider above in the tree supplies a value; `useContext(Ctx)` reads the closest provider's value (or the default when there is none) and re-renders when it changes.",
    problem:
      'Passing the same props through many intermediate components ("prop drilling") couples them to data they do not use.',
    whenToUse: [
      "Values many components at different depths need: theme, locale, current user, a store's dispatch.",
      'Overriding a value for one subtree (a nested provider).',
    ],
    whenNotToUse: [
      'Frequently changing values read by many components — every consumer re-renders; prefer an external store with selectors (`useSyncExternalStore`, Zustand, Redux).',
      'Avoiding two levels of props — passing props or `children` is clearer.',
    ],
    api: {
      signature:
        'function useContext<T>(context: Context<T>): T\n// React 19: <MyContext value={value}>…</MyContext>\n// React 19: const value = use(MyContext); // may be called conditionally',
      returns: 'The value of the closest provider above the calling component, or the default.',
    },
    execution: [
      'Render: React walks up to the closest provider for that context and returns its `value`.',
      'When a provider receives a new `value` (`Object.is` comparison), every consumer below re-renders — even through `memo` boundaries.',
      'Components outside any provider get the `createContext` default.',
    ],
    mistakes: [
      {
        title: 'Using the old provider syntax in new React 19 code',
        wrong: '<ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>',
        why: 'Still works, but React 19 renders the context itself as the provider and `.Provider` is slated for deprecation.',
        right: '<ThemeContext value={theme}>{children}</ThemeContext>',
      },
      {
        title: 'Calling useContext conditionally',
        wrong: 'if (!show) return null;\nconst user = useContext(UserContext);',
        why: 'Hooks must be called unconditionally at the top level.',
        right:
          'if (!show) return null;\nconst user = use(UserContext); // `use` is allowed after an early return',
      },
      {
        title: "Expecting the default value inside the provider's own component",
        wrong:
          'function App() {\n  const theme = useContext(ThemeContext); // not the value provided below!\n  return <ThemeContext value="dark">…</ThemeContext>;\n}',
        why: 'useContext looks *up* the tree from the calling component, never at providers it renders.',
      },
    ],
    edgeCases: [
      'A nullable context (`createContext<User | null>(null)`) forces consumers to handle "no provider"; a custom hook that throws is an alternative.',
      'Set `displayName` for readable names in React DevTools.',
    ],
    testing:
      'The demo test checks consumers inside and outside the providers, that a nested provider overrides only its subtree, that updates propagate, and that the conditional `use()` greeting handles the signed-out (`null`) value.',
    production: [
      'Wrap providers in one `AppProviders` component to avoid a pyramid at the root.',
      'Export a custom hook (`useTheme()`) instead of the raw context to centralise null checks.',
    ],
  },
  {
    id: 'use-context-performance',
    title: 'useContext — avoiding unnecessary re-renders',
    section: 'built-in',
    category: 'State & context',
    level: 'advanced',
    summary:
      'Compare an inline object value with split state/dispatch contexts and a memoised value, measured with render counts.',
    tags: [
      'context',
      'performance',
      're-render',
      'useMemo',
      'useCallback',
      'split context',
      'Profiler',
    ],
    demo: `${DIR}/UseContextPerformanceDemo.tsx`,
    sources: [`${DIR}/UseContextPerformanceDemo.tsx`],
    tests: [`${DIR}/UseContextPerformanceDemo.test.tsx`],
    minReact: '19.0',
    support: {
      level: 'universal',
      notes:
        'Uses React 19 `<Context value>` providers; the technique applies to every version since 16.8.',
    },
    officialDocs: [
      {
        label: 'useContext: optimizing re-renders when passing objects and functions',
        url: 'https://react.dev/reference/react/useContext#optimizing-re-renders-when-passing-objects-and-functions',
      },
      USE_CONTEXT_DOCS,
    ],
    related: ['use-context', 'use-reducer', 'use-state-colocation', 'use-sync-external-store'],
    concept:
      "Context consumers re-render whenever the provider's `value` changes identity. Keep values stable (`useMemo`/`useCallback`, primitives, stable setters) and split rarely-changing parts (dispatch) from frequently-changing parts (state).",
    problem:
      '`value={{ count, increment }}` is a new object every render, so even an unrelated provider update re-renders every consumer, and components that only call `increment` re-render whenever `count` changes.',
    whenToUse: [
      'Providers near the root, or with many consumers.',
      'Contexts that mix data and actions — expose actions in their own context.',
    ],
    whenNotToUse: [
      'Small trees where re-rendering is cheap — measure first.',
      'High-frequency data (cursor position, prices) — use an external store with selectors instead of context.',
    ],
    api: {
      signature:
        'const value = useMemo(() => ({ count, increment }), [count, increment]);\n<CountContext value={count}><SetCountContext value={setCount}>…',
    },
    execution: [
      'Provider re-renders → compares new `value` with the previous one using `Object.is`.',
      'Changed → React schedules every consumer of that context (memo does not stop it).',
      "Unchanged → consumers passed as `children` are not re-rendered by the provider's render.",
    ],
    mistakes: [
      {
        title: 'Inline object value',
        wrong: '<CounterContext value={{ count, increment: () => setCount((c) => c + 1) }}>',
        why: 'New object and function every render → every consumer re-renders on every provider render.',
        right:
          'const increment = useCallback(() => setCount((c) => c + 1), []);\nconst value = useMemo(() => ({ count, increment }), [count, increment]);',
      },
      {
        title: 'Expecting memo() to stop context updates',
        wrong:
          'const Button = memo(function Button() {\n  const { increment } = useContext(CounterContext);\n  /* … */\n});',
        why: 'memo compares props only; a context change still re-renders the component.',
        right: '// Read `increment` from a separate, stable SetCountContext.',
      },
    ],
    edgeCases: [
      'Memoising the object value fixes unrelated provider renders but not count changes: a consumer that only needs `increment` still re-renders — splitting fixes that too.',
      'The React Compiler memoises values automatically, but splitting contexts is still a design decision.',
    ],
    testing:
      'The demo test clicks increment and an unrelated provider update in each variant and asserts exact `<Profiler>` commit counts: naive re-renders everything, split keeps the button at one commit, memoised ignores unrelated updates.',
    production: [
      'Profile with React DevTools ("Highlight updates") before and after.',
      'For large shared state, libraries such as Zustand, Jotai or Redux give per-selector subscriptions.',
    ],
  },
];
