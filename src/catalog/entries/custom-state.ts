import type { CatalogEntry } from '../types';

export const entries: CatalogEntry[] = [
  {
    id: 'use-latest',
    title: 'useLatest',
    section: 'custom',
    category: 'State utilities',
    level: 'intermediate',
    summary: 'A ref that always holds the latest committed value, for long-lived callbacks.',
    tags: ['ref', 'stale closure', 'callbacks', 'subscriptions'],
    sources: ['hooks/state/useLatest.ts'],
    tests: ['hooks/state/useLatest.test.tsx'],
    minReact: '16.8',
    officialDocs: [
      { label: 'useRef', url: 'https://react.dev/reference/react/useRef' },
      { label: 'useEffectEvent', url: 'https://react.dev/reference/react/useEffectEvent' },
    ],
    related: ['use-event-listener'],
    concept: 'Stores a value in a ref and updates it in a layout effect after every commit.',
    problem:
      'Timers, subscriptions and listeners created once capture the props from the render that created them (a stale closure).',
    whenToUse: ['Reading the newest props/callbacks inside a subscription or timer created once.'],
    whenNotToUse: [
      'Inside Effects on React 19.2+, prefer `useEffectEvent` for non-reactive logic.',
      'Never read `ref.current` during render — the value would not be reactive.',
    ],
    api: {
      signature: 'function useLatest<T>(value: T): RefObject<T>',
      params: [{ name: 'value', type: 'T', description: 'Any value, typically a callback.' }],
      returns: 'A stable ref object whose `.current` is the latest committed value.',
    },
    testing: 'Asserts the ref identity is stable and `.current` follows re-renders.',
  },
  {
    id: 'use-previous',
    title: 'usePrevious',
    section: 'custom',
    category: 'State utilities',
    level: 'beginner',
    summary:
      'The previous *distinct* value of a prop or state, without touching refs during render.',
    tags: ['previous value', 'diff', 'trend', 'adjust state during render'],
    demo: 'examples/custom-hooks/state/UsePreviousDemo.tsx',
    sources: ['hooks/state/usePrevious.ts'],
    tests: ['hooks/state/usePrevious.test.tsx', 'hooks/timing/timing.ssr.test.tsx'],
    minReact: '16.8',
    support: { level: 'universal' },
    officialDocs: [
      {
        label: 'Storing information from previous renders',
        url: 'https://react.dev/reference/react/useState#storing-information-from-previous-renders',
      },
      {
        label: 'You might not need an Effect',
        url: 'https://react.dev/learn/you-might-not-need-an-effect',
      },
    ],
    related: ['use-undo-redo', 'use-controllable-state'],
    concept:
      'Tracks `{ current, previous }` in state. When the incoming value differs (`Object.is` or a custom `isEqual`), it calls `setState` during render — the documented "adjust state while rendering" pattern — and returns the value it replaced.',
    problem:
      'The classic `useRef` + `useEffect` version returns the value from the previous *render*: any unrelated re-render makes it equal to the current value, and reading `ref.current` during render breaks the rules of React (Strict Mode and concurrent rendering may repeat or discard renders).',
    whenToUse: [
      'Showing a change: "price went from 100 to 105", up/down arrows, animations keyed on direction.',
      'Comparing a prop with its previous value to reset some local state.',
    ],
    whenNotToUse: [
      'You want something *derived* from props/state (a "useDerivedState"): compute it during render, with `useMemo` if it is expensive. Copying props into state just to keep them in sync creates bugs — that is why this library has no `useDerivedState`.',
      'You need the previous value inside an Effect only: keep it in a ref written by that Effect.',
    ],
    api: {
      signature:
        'function usePrevious<T>(value: T, options?: { isEqual?: (previous: T, next: T) => boolean }): T | undefined',
      params: [
        { name: 'value', type: 'T', description: 'The value to track.' },
        {
          name: 'options.isEqual',
          type: '(previous, next) => boolean',
          description: 'Decides whether the value changed. Default `Object.is`.',
          optional: true,
        },
      ],
      returns: 'The value before the last change, or `undefined` until the first change.',
    },
    execution: [
      'Render: if `value` differs from the tracked value, `setState` is called during render.',
      'React throws away that render output and immediately re-renders the component with the new state — before committing, so children never see an inconsistent pair.',
      'No Effects, refs or cleanup are involved.',
    ],
    mistakes: [
      {
        title: 'Reading a ref during render',
        wrong:
          'function usePrevious(value) {\n  const ref = useRef();\n  useEffect(() => { ref.current = value; });\n  return ref.current;\n}',
        why: 'Returns the value from the previous render (equal to the current one after an unrelated re-render) and reads `ref.current` during render, which the React Compiler lint rules reject.',
        right: 'const previous = usePrevious(value);',
      },
    ],
    edgeCases: [
      'If `T` includes `undefined`, "no previous value yet" and "previous was `undefined`" are indistinguishable.',
      'With a custom `isEqual`, the stored value is the last one considered *different*; equal-but-new objects are not stored.',
      '`NaN` → `NaN` is not a change (`Object.is`).',
    ],
    testing:
      'Tests cover the first render, unrelated re-renders keeping the previous distinct value, custom equality and `NaN`; an SSR test renders it with `renderToString`.',
  },
  {
    id: 'use-boolean',
    title: 'useBoolean',
    section: 'custom',
    category: 'State utilities',
    level: 'beginner',
    summary: 'Boolean state with stable `setTrue`, `setFalse` and `toggle` actions.',
    tags: ['boolean', 'toggle', 'disclosure', 'modal', 'stable callbacks'],
    demo: 'examples/custom-hooks/state/UseBooleanDemo.tsx',
    sources: ['hooks/state/useBoolean.ts'],
    tests: [
      'hooks/state/useBoolean.test.tsx',
      'examples/custom-hooks/state/UseBooleanDemo.test.tsx',
    ],
    minReact: '16.8',
    support: { level: 'universal' },
    officialDocs: [{ label: 'useState', url: 'https://react.dev/reference/react/useState' }],
    related: ['use-toggle', 'use-stable-callback'],
    concept:
      'Wraps `useState(boolean)` and memoizes three named actions once, so their identities never change.',
    problem:
      'Inline `() => setOpen(true)` handlers are new functions on every render, which defeats `React.memo` children; `onClick={setOpen}` passes the click event as the new value.',
    whenToUse: ['Disclosures, dialogs, popovers, "editing" flags passed to memoized children.'],
    whenNotToUse: [
      'You only toggle in one place and nothing is memoized — plain `useState` is clearer.',
      'More than two values — use `useToggle` with a list, or a union-typed `useState`.',
    ],
    api: {
      signature:
        'function useBoolean(initialValue?: boolean | (() => boolean)): { value: boolean; setValue: Dispatch<SetStateAction<boolean>>; setTrue(): void; setFalse(): void; toggle(): void }',
      params: [
        {
          name: 'initialValue',
          type: 'boolean | () => boolean',
          description: 'Initial state (default `false`).',
          optional: true,
        },
      ],
      returns: 'The value plus stable actions. The returned object itself is new on every render.',
    },
    edgeCases: [
      'Actions ignore their arguments, so they are safe as event handlers.',
      '`toggle` uses a functional update: three toggles in one event flip the value three times.',
    ],
    testing:
      'Tests cover initial values, every action, multiple toggles in one `act`, stable identities and ignored event arguments; the demo test asserts a memoized child commits only once.',
  },
  {
    id: 'use-toggle',
    title: 'useToggle',
    section: 'custom',
    category: 'State utilities',
    level: 'beginner',
    summary: 'Cycle through a boolean or a fixed tuple of values (`light → dark → system`).',
    tags: ['toggle', 'cycle', 'theme', 'switch', 'const type parameter'],
    demo: 'examples/custom-hooks/state/UseToggleDemo.tsx',
    sources: ['hooks/state/useToggle.ts'],
    tests: ['hooks/state/useToggle.test.tsx', 'examples/custom-hooks/state/UseToggleDemo.test.tsx'],
    minReact: '16.8',
    support: { level: 'universal' },
    officialDocs: [{ label: 'useState', url: 'https://react.dev/reference/react/useState' }],
    related: ['use-boolean'],
    concept:
      'Stores the *index* of the current value; `toggle` advances it modulo the list length and `setValue` jumps to a value found with `Object.is`.',
    problem:
      'Cycling logic (`values[(values.indexOf(v) + 1) % values.length]`) gets rewritten in every component and breaks when the list is an inline array or contains `NaN`.',
    whenToUse: [
      'Theme switchers, sort direction (`asc → desc → none`), view modes, simple switches.',
    ],
    whenNotToUse: [
      'You need `setTrue`/`setFalse` style actions for a boolean — use `useBoolean`.',
      'The set of values is dynamic or user-defined — use `useState` with a union type.',
    ],
    api: {
      signature:
        'function useToggle(initialValue?: boolean): readonly [boolean, () => void, (value: boolean) => void]\nfunction useToggle<const T extends readonly [unknown, unknown, ...unknown[]]>(values: T, initialValue?: T[number]): readonly [T[number], () => void, (value: T[number]) => void]',
      params: [
        {
          name: 'values',
          type: 'readonly [A, B, ...]',
          description: 'Two or more values. Inline arrays are fine; literal types are inferred.',
          optional: true,
        },
        {
          name: 'initialValue',
          type: 'boolean | T[number]',
          description: 'Starting value (default: the first value / `false`).',
          optional: true,
        },
      ],
      returns: '`[value, toggle, setValue]`. `toggle` ignores arguments.',
    },
    edgeCases: [
      '`setValue` with a value not in the list is ignored (with a development warning).',
      'If the list gets shorter, the stored index wraps with modulo.',
      'Fewer than two values throws a `RangeError`.',
    ],
    testing:
      'Tests cover booleans, tuples, wrap-around, `setValue`, unknown values, stable callbacks and invalid lists.',
  },
  {
    id: 'use-counter',
    title: 'useCounter',
    section: 'custom',
    category: 'State utilities',
    level: 'beginner',
    summary: 'A number with `min`/`max` clamping, a `step`, `set` and `reset`.',
    tags: ['counter', 'stepper', 'quantity', 'clamp', 'min max'],
    demo: 'examples/custom-hooks/state/UseCounterDemo.tsx',
    sources: ['hooks/state/useCounter.ts'],
    tests: [
      'hooks/state/useCounter.test.tsx',
      'examples/custom-hooks/state/UseCounterDemo.test.tsx',
    ],
    minReact: '16.8',
    support: { level: 'universal' },
    officialDocs: [
      {
        label: 'Updating state based on the previous state',
        url: 'https://react.dev/reference/react/useState#updating-state-based-on-the-previous-state',
      },
    ],
    related: ['use-boolean', 'use-controllable-state'],
    concept:
      'Keeps a number in state and clamps every update to `[min, max]`. The rendered `count` is clamped as well, so narrowing the bounds never shows an out-of-range value.',
    problem:
      'Bounds checks spread across buttons and inputs drift apart; non-functional updates lose increments when several happen in one event.',
    whenToUse: ['Quantity steppers, pagination, ratings, zoom levels.'],
    whenNotToUse: [
      'Free-form numeric input: keep the raw text in state (users type `-`, `1.`, empty) and validate it — the demo does exactly that for its bound inputs.',
    ],
    api: {
      signature:
        'function useCounter(initialValue?: number, options?: { min?: number; max?: number; step?: number }): { count: number; increment(): void; decrement(): void; set(next: number | ((n: number) => number)): void; reset(): void; isAtMin: boolean; isAtMax: boolean }',
      params: [
        {
          name: 'initialValue',
          type: 'number',
          description: 'Default `0`; clamped.',
          optional: true,
        },
        {
          name: 'options.min / max',
          type: 'number',
          description: 'Inclusive bounds (default ±Infinity).',
          optional: true,
        },
        {
          name: 'options.step',
          type: 'number',
          description: 'Used by increment/decrement (default 1).',
          optional: true,
        },
      ],
      returns:
        'The clamped `count`, actions (stable while the options are unchanged) and bound flags for disabling buttons.',
    },
    edgeCases: [
      '`set(NaN)` (or an updater returning `NaN`) is ignored.',
      '`min > max` throws a `RangeError` during render — a programming error.',
      '`reset()` returns to the first-render initial value, clamped to the current bounds.',
    ],
    testing:
      'Tests cover steps, clamping, updaters, NaN, narrowing bounds, stable actions and invalid bounds.',
  },
  {
    id: 'use-list',
    title: 'useList',
    section: 'custom',
    category: 'State utilities',
    level: 'intermediate',
    summary:
      'An array in state with immutable `push`, `insertAt`, `updateAt`, `removeAt`, `move`, `filter`, `clear`, `reset`.',
    tags: ['array', 'list', 'immutable', 'reorder', 'todo'],
    demo: 'examples/custom-hooks/state/UseListDemo.tsx',
    sources: ['hooks/state/useList.ts'],
    tests: ['hooks/state/useList.test.tsx', 'examples/custom-hooks/state/UseListDemo.test.tsx'],
    minReact: '16.8',
    support: {
      level: 'universal',
      notes: 'Uses ES2023 `Array#with`/`toSpliced` (Baseline 2023).',
    },
    officialDocs: [
      {
        label: 'Updating arrays in state',
        url: 'https://react.dev/learn/updating-arrays-in-state',
      },
    ],
    related: ['use-set', 'use-map', 'use-queue'],
    concept:
      'Every action is a functional `setState` that returns a new array — or the *same* array when nothing changed, so React bails out of the re-render.',
    problem:
      'Mutating methods (`push`, `splice`, `sort`) change the array in place: React compares state with `Object.is`, sees the same reference and does not re-render.',
    whenToUse: ['Editable lists, reorderable items, form field arrays in small UIs.'],
    whenNotToUse: [
      'Large lists edited deeply — consider `useReducer` with Immer or a normalized store.',
      'Complex form arrays with validation — use a form library (e.g. React Hook Form `useFieldArray`).',
    ],
    api: {
      signature:
        'function useList<T>(initialList?: readonly T[] | (() => readonly T[])): readonly [readonly T[], { set; push(...items); insertAt(index, item); updateAt(index, updater); removeAt(index); move(from, to); filter(predicate); clear(); reset() }]',
      params: [
        {
          name: 'initialList',
          type: 'readonly T[] | () => readonly T[]',
          description: 'Initial items (also used by `reset`).',
          optional: true,
        },
      ],
      returns: '`[list, actions]`; the actions object is stable for the component lifetime.',
    },
    mistakes: [
      {
        title: 'Mutating state in place',
        wrong: 'list.push(item);\nsetList(list);',
        why: "Same reference → React skips the render, and the previous render's data was mutated too.",
        right: 'actions.push(item); // setList((previous) => [...previous, item])',
      },
    ],
    edgeCases: [
      'Out-of-range or negative indices are ignored (not counted from the end); `insertAt` clamps.',
      '`updateAt` returning the same item, `filter` removing nothing and `clear` on an empty list keep the previous array.',
      'Index-based actions use the index at update time — prefer stable ids for keys.',
    ],
    testing:
      'Tests check each action, that previous arrays are never mutated, that no-ops keep the same reference and that updates compose.',
  },
  {
    id: 'use-set',
    title: 'useSet',
    section: 'custom',
    category: 'State utilities',
    level: 'intermediate',
    summary: 'A `Set` in state with immutable `add`, `remove`, `toggle`, `clear`, `reset`.',
    tags: ['set', 'selection', 'tags', 'immutable'],
    demo: 'examples/custom-hooks/state/UseSetMapDemo.tsx',
    sources: ['hooks/state/useSet.ts'],
    tests: ['hooks/state/useSet.test.tsx', 'examples/custom-hooks/state/UseSetMapDemo.test.tsx'],
    minReact: '16.8',
    support: { level: 'universal' },
    officialDocs: [
      {
        label: 'Choosing the state structure',
        url: 'https://react.dev/learn/choosing-the-state-structure',
      },
      {
        label: 'MDN: Set',
        url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set',
      },
    ],
    related: ['use-map', 'use-list'],
    concept:
      'Copies the set (`new Set(previous)`) for every real change and exposes it as `ReadonlySet`, so callers cannot mutate it by accident.',
    problem:
      '`set.add(x); setSet(set)` mutates the existing instance; React sees the same object and does not re-render.',
    whenToUse: ['Multi-selection (checked rows, selected tags), visited/expanded ids.'],
    whenNotToUse: [
      'Very large sets updated at high frequency — copying is O(n); use a ref + version counter or an external store.',
    ],
    api: {
      signature:
        'function useSet<T>(initialValues?: Iterable<T> | (() => Iterable<T>)): readonly [ReadonlySet<T>, { add(v); remove(v); toggle(v, force?); clear(); reset() }]',
      returns: '`[set, actions]` with stable actions.',
    },
    edgeCases: [
      'Objects are compared by reference (SameValueZero), like `Set` itself.',
      'No-op changes keep the same instance, so React bails out.',
    ],
    testing:
      'Tests check new instances per change, untouched old instances, no-op bail-outs and reference semantics.',
  },
  {
    id: 'use-map',
    title: 'useMap',
    section: 'custom',
    category: 'State utilities',
    level: 'intermediate',
    summary: 'A `Map` in state with immutable `set`, `update`, `remove`, `clear`, `reset`.',
    tags: ['map', 'dictionary', 'cart', 'immutable'],
    demo: 'examples/custom-hooks/state/UseSetMapDemo.tsx',
    sources: ['hooks/state/useMap.ts'],
    tests: ['hooks/state/useMap.test.tsx', 'examples/custom-hooks/state/UseSetMapDemo.test.tsx'],
    minReact: '16.8',
    support: { level: 'universal' },
    officialDocs: [
      {
        label: 'MDN: Map',
        url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map',
      },
    ],
    related: ['use-set', 'use-list'],
    concept:
      'Creates a new `Map` for every change; `update(key, fn)` computes the next value from the current one inside a functional update.',
    problem:
      'Mutating a `Map` held in state does not re-render, and read-modify-write updates lose writes when batched.',
    whenToUse: ['Per-id data: quantities, drafts, loading flags keyed by id, non-string keys.'],
    whenNotToUse: [
      'Plain string keys with JSON-serialisable values that you also persist — an object record may be simpler.',
    ],
    api: {
      signature:
        'function useMap<K, V>(initialEntries?: Iterable<readonly [K, V]> | (() => Iterable<readonly [K, V]>)): readonly [ReadonlyMap<K, V>, { set(k, v); update(k, (current?: V) => V); remove(k); clear(); reset() }]',
      returns: '`[map, actions]` with stable actions.',
    },
    edgeCases: [
      'Setting an existing key to an `Object.is`-equal value keeps the same instance.',
      'Updating an existing key keeps its insertion position.',
    ],
    testing:
      'Tests cover immutable updates, composed `update` calls, insertion order, no-ops and explicit `undefined` values.',
  },
  {
    id: 'use-queue',
    title: 'useQueue',
    section: 'custom',
    category: 'State utilities',
    level: 'intermediate',
    summary: 'A FIFO queue whose `dequeue()` returns the removed item synchronously.',
    tags: ['queue', 'fifo', 'jobs', 'useSyncExternalStore', 'notifications'],
    demo: 'examples/custom-hooks/state/UseQueueDemo.tsx',
    sources: ['hooks/state/useQueue.ts'],
    tests: [
      'hooks/state/useQueue.test.tsx',
      'examples/custom-hooks/state/UseQueueDemo.test.tsx',
      'hooks/timing/timing.ssr.test.tsx',
    ],
    minReact: '18.0',
    support: { level: 'universal' },
    officialDocs: [
      {
        label: 'useSyncExternalStore',
        url: 'https://react.dev/reference/react/useSyncExternalStore',
      },
    ],
    related: ['use-list'],
    concept:
      'Holds the queue in a tiny per-component store (created once with `useState`) and reads it through `useSyncExternalStore`. Mutations replace the snapshot array immediately and notify React.',
    problem:
      'With `useState`, the next state is computed later inside an updater, so `dequeue()` cannot return the item — and two `dequeue()` calls in one event would both see the same front item.',
    whenToUse: [
      'Toast/notification queues, job processing, sequential animations, rate-limited work.',
    ],
    whenNotToUse: [
      'A queue shared between components or tabs — use a real store (Zustand, Redux) or a module-level store.',
      'You never need the returned item — `useList` is enough.',
    ],
    api: {
      signature:
        'function useQueue<T>(initialItems?: readonly T[]): { items: readonly T[]; size: number; first?: T; last?: T; enqueue(...items: T[]): void; dequeue(): T | undefined; peek(): T | undefined; clear(): void }',
      returns:
        'Snapshot fields for rendering plus stable actions; `peek()` reads the live front item.',
    },
    execution: [
      'Render: `useSyncExternalStore` returns the current snapshot (also used as the server snapshot).',
      'Event: `enqueue`/`dequeue` replace the snapshot synchronously and notify subscribers; React re-renders.',
      'Unmount: React unsubscribes; the store is garbage-collected with the component.',
    ],
    edgeCases: [
      'Updates are synchronous and cannot be marked as transitions.',
      'Do not call the actions during render.',
      'If `T` includes `undefined`, an empty queue and an `undefined` item look the same from `dequeue()`.',
    ],
    testing:
      'Tests cover FIFO order, two synchronous dequeues in one event, `peek` before a re-render, empty queues, immutable snapshots and stable actions.',
  },
  {
    id: 'use-undo-redo',
    title: 'useUndoRedo',
    section: 'custom',
    category: 'State utilities',
    level: 'advanced',
    summary:
      'Undo/redo history (past/present/future) with a pure reducer, a history limit and coalescing.',
    tags: ['undo', 'redo', 'history', 'useReducer', 'editor', 'keyboard shortcuts'],
    demo: 'examples/custom-hooks/state/UseUndoRedoDemo.tsx',
    sources: ['hooks/state/useUndoRedo.ts'],
    tests: [
      'hooks/state/useUndoRedo.test.tsx',
      'examples/custom-hooks/state/UseUndoRedoDemo.test.tsx',
    ],
    minReact: '16.8',
    support: { level: 'universal' },
    officialDocs: [
      { label: 'useReducer', url: 'https://react.dev/reference/react/useReducer' },
      {
        label: 'Extracting state logic into a reducer',
        url: 'https://react.dev/learn/extracting-state-logic-into-a-reducer',
      },
    ],
    related: ['use-list', 'use-previous', 'use-event-listener'],
    concept:
      'A reducer manages `past`, `present` and `future` stacks. `set` pushes the old present onto `past` and clears `future`; `undo`/`redo` move one state between the stacks. Impure inputs (the timestamp for coalescing, the options) travel in the action, so the reducer stays pure.',
    problem:
      'Ad-hoc history with several `useState` calls gets out of sync, forgets to clear the redo stack, grows without bound, and records every keystroke as its own undo step.',
    whenToUse: ['Editors, drawing tools, form builders, any UI where users expect Ctrl/⌘+Z.'],
    whenNotToUse: [
      'Huge documents: snapshots of the whole state are kept — store patches (Immer `produceWithPatches`) or commands instead.',
      'A timestamped log with `go(index)` navigation ("useStateWithHistory") was intentionally **not** added: it is the same past/present/future model (the timeline is `[...past, present, ...future]`), so a second hook would only duplicate this one.',
      'Collaborative editing — history must be per user and merged (CRDT/OT libraries).',
    ],
    api: {
      signature:
        'function useUndoRedo<T>(initialPresent: T, options?: { limit?: number; coalesceWindowMs?: number }): { present: T; past: readonly T[]; future: readonly T[]; canUndo: boolean; canRedo: boolean; set(next: SetStateAction<T>, options?: { coalesceKey?: string }): void; undo(): void; redo(): void; reset(present?: T): void }',
      params: [
        {
          name: 'initialPresent',
          type: 'T',
          description: 'Initial state; also the default for `reset()`.',
        },
        {
          name: 'options.limit',
          type: 'number',
          description: 'Max undo steps kept (default unlimited).',
          optional: true,
        },
        {
          name: 'options.coalesceWindowMs',
          type: 'number',
          description:
            'Max gap between `set` calls sharing a `coalesceKey` to merge them (default 1000).',
          optional: true,
        },
      ],
      returns: 'The history state and stable actions.',
    },
    execution: [
      '`set` reads `Date.now()` in the event handler and dispatches it with the value or updater.',
      'The reducer resolves the updater, ignores `Object.is`-equal values, merges into the current step when the coalesce key matches within the window, otherwise pushes a new step and trims to `limit`.',
      '`undo`/`redo` also end the current coalescing group.',
    ],
    mistakes: [
      {
        title: 'Mutating a snapshot',
        wrong: 'history.present.items.push(item);\nhistory.set(history.present);',
        why: 'The same object is referenced from `past`, so undo "restores" the mutated version — and `Object.is` makes the set a no-op.',
        right: 'history.set((doc) => ({ ...doc, items: [...doc.items, item] }));',
      },
    ],
    edgeCases: [
      'Undo/redo at the ends of the history are no-ops (same state object).',
      'A coalesced change never merges into the initial state: the first change of a burst is always its own step.',
      'Keyboard shortcuts in the demo override the native input undo while focus is in the title field, keeping one consistent history.',
    ],
    testing:
      'Tests cover undo/redo, clearing the redo stack, no-ops, the history limit, time-based coalescing with fake timers, reset, stable actions and reducer purity; the demo test drives buttons and Ctrl/⌘+Z.',
    production: [
      'Bind both Ctrl+Z and ⌘+Z, plus Shift+Z / Ctrl+Y for redo, and expose visible buttons for pointer and assistive-technology users.',
      'Persisting history? Store only `present` unless users expect history to survive reloads.',
    ],
    diagram: {
      title: 'History transitions',
      description: 'How set, undo and redo move states between the three stacks.',
      mermaid:
        'stateDiagram-v2\n  [*] --> Present\n  Present --> Past: set(new) pushes old present\n  Past --> Present: undo pops last past\n  Present --> Future: undo pushes old present\n  Future --> Present: redo shifts first future\n  Future --> [*]: set(new) clears future',
    },
  },
  {
    id: 'use-stable-callback',
    title: 'useStableCallback',
    section: 'custom',
    category: 'State utilities',
    level: 'advanced',
    summary: 'A function with a permanent identity that always calls the latest callback.',
    tags: ['useCallback', 'memo', 'event handler', 'useEffectEvent', 'useEvent', 'stale closure'],
    demo: 'examples/custom-hooks/state/UseStableCallbackDemo.tsx',
    sources: ['hooks/state/useStableCallback.ts'],
    tests: [
      'hooks/state/useStableCallback.test.tsx',
      'examples/custom-hooks/state/UseStableCallbackDemo.test.tsx',
    ],
    minReact: '18.0',
    support: { level: 'universal' },
    officialDocs: [
      { label: 'useEffectEvent', url: 'https://react.dev/reference/react/useEffectEvent' },
      { label: 'useInsertionEffect', url: 'https://react.dev/reference/react/useInsertionEffect' },
      { label: 'memo', url: 'https://react.dev/reference/react/memo' },
    ],
    related: ['use-latest', 'use-boolean', 'use-debounced-callback'],
    concept:
      'Stores the latest callback in a ref from `useInsertionEffect` (which runs before every layout effect, so even child layout effects see the newest callback) and returns a `useCallback([])` wrapper that forwards to it.',
    problem:
      '`useCallback` with dependencies changes identity whenever its inputs change, re-rendering memoized children; dropping dependencies causes stale closures.',
    whenToUse: [
      'Event handlers passed to `React.memo` children, virtualised rows or context values.',
      'Callbacks handed to hooks/subscriptions that should not re-subscribe when the handler changes.',
    ],
    whenNotToUse: [
      'Inside Effects on React 19.2+: use the built-in `useEffectEvent`, which the lint rules understand.',
      'During render: the wrapper calls the callback from the *last commit*, which can be stale while rendering — it is for events and effects only.',
      'Nothing is memoized downstream — a plain inline function is simpler.',
    ],
    api: {
      signature:
        'function useStableCallback<Args extends unknown[], R>(callback: (...args: Args) => R): (...args: Args) => R',
      params: [
        { name: 'callback', type: '(...args) => R', description: 'May change every render.' },
      ],
      returns: 'A function with a stable identity that forwards arguments and the return value.',
    },
    execution: [
      'Render: nothing is read or written; the stable wrapper is returned.',
      'Commit (insertion phase): the ref is updated to the new callback.',
      'Later events call the wrapper, which calls the latest committed callback.',
    ],
    mistakes: [
      {
        title: 'Calling it during render',
        wrong: 'const label = useStableCallback(() => format(value));\nreturn <p>{label()}</p>;',
        why: 'The ref still holds the callback from the previous commit, so the output is one render stale.',
        right: 'return <p>{format(value)}</p>;',
      },
    ],
    edgeCases: ['A discarded (never committed) render does not update the callback — by design.'],
    testing:
      'Tests assert a stable identity, latest-callback calls, that a memoized child skips re-renders, and that child layout effects already see the new callback.',
  },
  {
    id: 'use-controllable-state',
    title: 'useControllableState',
    section: 'custom',
    category: 'State utilities',
    level: 'advanced',
    summary:
      'Support both controlled (`value` + `onChange`) and uncontrolled (`defaultValue`) usage in one component.',
    tags: ['controlled', 'uncontrolled', 'component api', 'radix', 'design system'],
    demo: 'examples/custom-hooks/state/UseControllableStateDemo.tsx',
    sources: ['hooks/state/useControllableState.ts'],
    tests: [
      'hooks/state/useControllableState.test.tsx',
      'examples/custom-hooks/state/UseControllableStateDemo.test.tsx',
      'hooks/timing/timing.ssr.test.tsx',
    ],
    minReact: '16.8',
    support: { level: 'universal' },
    officialDocs: [
      {
        label: 'Controlled and uncontrolled components',
        url: 'https://react.dev/learn/sharing-state-between-components#controlled-and-uncontrolled-components',
      },
    ],
    related: ['use-previous', 'use-stable-callback', 'use-counter'],
    concept:
      'If `value` is not `undefined`, the component is controlled and renders the prop; otherwise it renders internal state seeded from `defaultValue`. `setValue` resolves updaters, skips `Object.is`-equal results and calls `onChange` in both modes.',
    problem:
      'Reusable components (inputs, tabs, accordions) are expected to work like native inputs: either fully owned by the parent or self-managed. Hand-rolled versions duplicate state, call `onChange` with stale values or silently break when a prop flips between `undefined` and a value.',
    whenToUse: ['Design-system components with `value`/`defaultValue`/`onValueChange` props.'],
    whenNotToUse: [
      'Application components with a single owner — just lift the state up.',
      'Mirroring a prop into state to "derive" something ("useDerivedState"): compute the derived value during render (with `useMemo` if expensive), or reset state with a `key`. This library intentionally has no `useDerivedState` hook.',
    ],
    api: {
      signature:
        'function useControllableState<T>(options: { value?: T; defaultValue: T; onChange?: (value: T) => void; name?: string }): readonly [T, (next: SetStateAction<T>) => void]',
      params: [
        {
          name: 'value',
          type: 'T | undefined',
          description: 'Controlled value; `undefined` = uncontrolled.',
          optional: true,
        },
        { name: 'defaultValue', type: 'T', description: 'Initial value while uncontrolled.' },
        {
          name: 'onChange',
          type: '(value: T) => void',
          description: 'Called with every new value (latest callback is used).',
          optional: true,
        },
        {
          name: 'name',
          type: 'string',
          description: 'Component name for the development warning.',
          optional: true,
        },
      ],
      returns: '`[value, setValue]`; `setValue` is stable.',
    },
    execution: [
      'Render: picks the prop or the internal state.',
      'Layout effect: records the committed value for the next `setValue`.',
      'Event: `setValue` computes the next value; uncontrolled mode updates state (and the recorded value, so several updaters in one event compose); `onChange` fires.',
      'Effect (development): warns once if the mode differs from the first render.',
    ],
    edgeCases: [
      'Controlled updaters in the same event all see the same prop until the parent re-renders.',
      'Switching modes keeps the internal state as it was — it is not synced from the last controlled value (and a warning is logged).',
      'Use `null`, not `undefined`, for "no selection" in controlled mode.',
      '`T` must not be a function type, because functions are treated as updaters.',
    ],
    testing:
      'Tests cover both modes, a parent rejecting a change, composed uncontrolled updaters, no-op updates, the latest `onChange`, a stable setter and the single mode-switch warning.',
  },
];
