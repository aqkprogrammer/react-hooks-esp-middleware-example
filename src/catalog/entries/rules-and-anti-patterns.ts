import type { CatalogEntry } from '../types';

const A = 'examples/anti-patterns';
const B = `${A}/broken`;
const RULES = 'Rules of Hooks';
const ANTI = 'Anti-patterns';

const RULES_OF_HOOKS_DOCS = {
  label: 'Rules of Hooks',
  url: 'https://react.dev/reference/rules/rules-of-hooks',
};
const PURITY_DOCS = {
  label: 'Components and Hooks must be pure',
  url: 'https://react.dev/reference/rules/components-and-hooks-must-be-pure',
};

export const entries: CatalogEntry[] = [
  // ---- Rules of Hooks -----------------------------------------------------
  {
    id: 'rules-of-hooks',
    title: 'Rules of Hooks',
    section: 'anti-pattern',
    category: RULES,
    level: 'beginner',
    summary:
      'Call Hooks only at the top level of components and custom Hooks — never conditionally, in loops or in callbacks.',
    tags: ['rules of hooks', 'conditional hooks', 'loops', 'early return', 'callbacks', 'lint'],
    demo: `${A}/RulesOfHooksDemo.tsx`,
    sources: [
      `${A}/RulesOfHooksDemo.tsx`,
      `${B}/ConditionalHook.tsx`,
      `${B}/HookInLoop.tsx`,
      `${B}/HookInCallback.tsx`,
    ],
    tests: [`${A}/RulesOfHooksDemo.test.tsx`],
    minReact: '16.8',
    officialDocs: [RULES_OF_HOOKS_DOCS],
    related: ['hook-call-order', 'custom-hooks-share-logic', 'eslint-plugin-react-hooks'],
    concept:
      'Hooks (`use…` functions) may only be called at the top level of a function component or a custom Hook: not inside conditions, loops, nested functions, `try/catch/finally`, after an early `return`, in class components or in event handlers. (`use` itself is the exception that may be called conditionally.)',
    problem:
      'React identifies each Hook by its call position. Any code path that changes how many Hooks run, or in what order, makes state, effects and memoised values attach to the wrong call.',
    whenToUse: [
      'Move conditions *inside* the Hook (`useEffect(() => { if (name) … })`).',
      'Turn per-item Hooks into a per-item component, keyed by id.',
      'Put the early return in the parent (render the component conditionally) or after all Hooks.',
      'Read Hook values at the top level and use them inside callbacks.',
    ],
    mistakes: [
      {
        title: 'Hook after an early return',
        wrong: "if (!userId) return <SignIn />;\nconst [name, setName] = useState('');",
        why: 'When `userId` changes the component renders a different number of Hooks: “Rendered more/fewer hooks than expected”.',
        right: "const [name, setName] = useState('');\nif (!userId) return <SignIn />;",
      },
      {
        title: 'Hook inside an event handler',
        wrong: 'onClick={() => {\n  const [count, setCount] = useState(0);\n}}',
        why: 'Hooks only work while React renders a component. Call it at the top level and use the setter in the handler.',
        right: 'const [count, setCount] = useState(0);\nonClick={() => setCount(count + 1)}',
      },
    ],
    testing:
      'The broken files are shown as text only (excluded from tsc, ESLint, Vitest and the bundle). The corrected demo is tested: the effect runs only while its inner condition holds and cleans up, the form unmounts instead of returning early, per-item state survives reordering, and context read at the top level is used in a handler.',
  },
  {
    id: 'hook-call-order',
    title: 'Why call order matters (Hook slots)',
    section: 'anti-pattern',
    category: RULES,
    level: 'intermediate',
    summary:
      'A visual simulation of React’s per-component list of Hook slots, and how a conditional call shifts them.',
    tags: ['hook slots', 'call order', 'linked list', 'simulation', 'conditional hooks'],
    demo: `${A}/HookSlotsDemo.tsx`,
    sources: [`${A}/hookSlots.ts`, `${A}/HookSlotsDemo.tsx`],
    tests: [`${A}/hookSlots.test.ts`, `${A}/HookSlotsDemo.test.tsx`],
    minReact: '16.8',
    officialDocs: [
      RULES_OF_HOOKS_DOCS,
      {
        label: 'Why do Hooks rely on call order? (legacy docs)',
        url: 'https://legacy.reactjs.org/docs/hooks-rules.html#explanation',
      },
    ],
    related: ['rules-of-hooks', 'eslint-plugin-react-hooks'],
    concept:
      'On the first render React creates one slot per Hook call, in order. On every later render the n-th call reads the n-th slot. React never looks at variable names. The demo is a pure simulation of that pairing — no Hooks are actually misused.',
    problem:
      'Without the model, the Rules of Hooks look arbitrary. With it, the failure modes are predictable: shifted slots, silently swapped state, and the two errors React throws.',
    execution: [
      'Mount: calls `[useState name, useEffect persistForm, useState surname, useEffect updateTitle]` create four slots.',
      'Next render with an empty name skips `persistForm`: `surname` lands in the effect slot, `updateTitle` in a state slot, and the last slot is never reached.',
      'React warns “change in the order of Hooks” in development and throws “Rendered fewer hooks than expected”.',
      'Hooks in a loop that reorder keep the same *types*, so React cannot detect it at all — state is silently swapped.',
    ],
    edgeCases: [
      'React’s development check compares Hook *types* only; two `useState` calls swapping places produce no error, just wrong data.',
      'More calls than slots throws “Rendered more hooks than during the previous render.”',
    ],
    testing:
      'Unit tests cover the pairing function and React’s verdict for each case; the demo test toggles the condition and the loop order and reads the result badges.',
    diagram: {
      title: 'A skipped Hook shifts every later slot',
      description:
        'Slots from the first render paired by position with the calls of a render that skipped persistForm.',
      mermaid: [
        'flowchart LR',
        '  subgraph S[Slots from first render]',
        '    S0[0 useState name]',
        '    S1[1 useEffect persistForm]',
        '    S2[2 useState surname]',
        '    S3[3 useEffect updateTitle]',
        '  end',
        '  subgraph C[Calls when name is empty]',
        '    C0[useState name]',
        '    C1[useState surname]',
        '    C2[useEffect updateTitle]',
        '  end',
        '  C0 --> S0',
        '  C1 -- wrong type --> S1',
        '  C2 -- wrong type --> S2',
        '  S3 -. never reached .-> X[Rendered fewer hooks than expected]',
      ].join('\n'),
    },
  },
  {
    id: 'custom-hooks-share-logic',
    title: 'Custom Hooks share logic, not state',
    section: 'anti-pattern',
    category: RULES,
    level: 'beginner',
    summary: 'Two components calling the same custom Hook get two independent states.',
    tags: ['custom hooks', 'shared state', 'lifting state', 'context'],
    demo: `${A}/CustomHookStateDemo.tsx`,
    sources: [`${A}/CustomHookStateDemo.tsx`],
    tests: [`${A}/CustomHookStateDemo.test.tsx`],
    minReact: '16.8',
    officialDocs: [
      {
        label: 'Custom Hooks let you share stateful logic, not state itself',
        url: 'https://react.dev/learn/reusing-logic-with-custom-hooks#custom-hooks-let-you-share-stateful-logic-not-state-itself',
      },
    ],
    related: ['rules-of-hooks', 'testing-custom-hooks', 'use-sync-external-store'],
    concept:
      'A custom Hook is just a function whose name starts with `use` and that calls other Hooks. Each call runs those Hooks inside the calling component, so each caller owns separate state.',
    problem:
      'Developers extract `useCart()` expecting every component that calls it to see the same cart, and are surprised that updates in one place don’t show up elsewhere.',
    whenToUse: [
      'Extract a custom Hook to reuse behaviour (subscriptions, timers, form logic).',
      'To share *state*: call the Hook once and pass the result down, put it in context, or keep it in an external store read with `useSyncExternalStore` (or Zustand/Redux/Jotai).',
    ],
    whenNotToUse: ['Do not wrap a single built-in Hook just to rename it.'],
    testing:
      'Clicking one card changes only its own count (and reset is per card); two displays fed by one Hook call in the parent stay in sync.',
  },
  {
    id: 'eslint-plugin-react-hooks',
    title: 'How eslint-plugin-react-hooks detects violations',
    section: 'anti-pattern',
    category: RULES,
    level: 'intermediate',
    summary:
      'rules-of-hooks and exhaustive-deps plus the React Compiler-powered rules this project runs.',
    tags: [
      'eslint',
      'lint',
      'exhaustive-deps',
      'rules-of-hooks',
      'react compiler',
      'recommended-latest',
    ],
    demo: `${A}/LintRulesDemo.tsx`,
    sources: [
      `${A}/lintRules.ts`,
      `${A}/LintRulesDemo.tsx`,
      `${B}/ConditionalHook.tsx`,
      `${B}/DerivedStateInEffect.tsx`,
      `${B}/RefsDuringRender.tsx`,
      `${B}/SetStateDuringRender.tsx`,
    ],
    tests: [`${A}/lintRules.test.ts`, `${A}/LintRulesDemo.test.tsx`],
    minReact: '16.8',
    officialDocs: [
      {
        label: 'eslint-plugin-react-hooks lints',
        url: 'https://react.dev/reference/eslint-plugin-react-hooks',
      },
      {
        label: 'React Compiler v1.0 (compiler-powered lints)',
        url: 'https://react.dev/blog/2025/10/07/react-compiler-1',
      },
    ],
    related: [
      'rules-of-hooks',
      'react-compiler',
      'set-state-during-render',
      'reading-refs-during-render',
    ],
    concept:
      'This project enables `eslint-plugin-react-hooks` 7 `recommended-latest`: the classic `rules-of-hooks` (error) and `exhaustive-deps` (warning), plus 15 rules backed by the React Compiler’s analysis such as `purity`, `refs`, `immutability`, `set-state-in-effect`, `set-state-in-render`, `static-components` and `preserve-manual-memoization`.',
    problem:
      'Rules-of-Hooks bugs and impure renders often work in simple tests and fail later (reordering, concurrent rendering, the compiler skipping a component). Static analysis catches most of them as you type.',
    execution: [
      '`rules-of-hooks`: finds calls whose name matches `use[A-Z]` (and `use`) and checks the enclosing function is a component (capitalised) or a Hook (`use` prefix), and that the call is not inside a condition, loop, nested function or after an early return.',
      '`exhaustive-deps`: compares the variables an effect/memo/callback reads with its dependency array; flags missing, unnecessary and always-changing (object/function created in render) dependencies.',
      'Compiler-powered rules: run the compiler’s data-flow analysis on each component and Hook (without compiling) and report code that breaks the Rules of React — the same code the compiler would skip.',
    ],
    edgeCases: [
      'Analysis stops at function boundaries you write: an inline object passed to a custom Hook that uses it as a dependency is not flagged (see Memoization pitfalls).',
      '`immutability` flags assignments like `state.done = true` but not array methods such as `push`/`sort` on state — the broken MutatingState example shows both.',
      'Lint suppressions in this repository require the specific rule name and a written justification.',
    ],
    testing:
      '`lintRules.test.ts` compares the documented rules and severities with the installed plugin’s `recommended-latest` preset, so the page cannot drift from the real config. Where a lint rule catches a broken example, its header names the rule; this was checked by running ESLint on the (normally ignored) files.',
  },

  // ---- Anti-patterns ------------------------------------------------------
  {
    id: 'effect-chains-derived-state',
    title: 'Effect chains & derived state in effects',
    section: 'anti-pattern',
    category: ANTI,
    level: 'beginner',
    summary:
      'Copying computable values into state via effects causes extra renders and stale frames — compute them during render.',
    tags: [
      'derived state',
      'useEffect',
      'effect chain',
      'set-state-in-effect',
      'you might not need an effect',
    ],
    demo: `${A}/DerivedStateDemo.tsx`,
    sources: [`${A}/DerivedStateDemo.tsx`, `${B}/DerivedStateInEffect.tsx`],
    tests: [`${A}/DerivedStateDemo.test.tsx`],
    minReact: '16.8',
    officialDocs: [
      {
        label: 'You Might Not Need an Effect',
        url: 'https://react.dev/learn/you-might-not-need-an-effect',
      },
    ],
    related: ['you-might-not-need-an-effect', 'use-state-derived-state', 'use-memo'],
    concept:
      'If a value can be calculated from props or state, it is not state. The fixed cart derives the filtered list, total and summary during render from the only real state, the query.',
    problem:
      'The broken version stores three derived values and syncs them with three effects that trigger each other: every keystroke renders four times and briefly shows inconsistent numbers. `react-hooks/set-state-in-effect` reports each setState.',
    mistakes: [
      {
        title: 'Syncing derived state with an effect',
        wrong: 'useEffect(() => {\n  setTotal(items.reduce(sum, 0));\n}, [items]);',
        why: 'An extra render after every change, with one frame showing the old total.',
        right: 'const total = items.reduce(sum, 0);',
      },
    ],
    testing:
      'The test checks list and summary update together and that the cart commits exactly once per keystroke.',
  },
  {
    id: 'fetch-without-cleanup',
    title: 'Fetching without cleanup',
    section: 'anti-pattern',
    category: ANTI,
    level: 'intermediate',
    summary:
      'Without cleanup, the last response wins — not the last request. Abort or ignore stale requests.',
    tags: ['race condition', 'AbortController', 'fetch', 'useEffect cleanup', 'stale response'],
    demo: `${A}/FetchCleanupDemo.tsx`,
    sources: [`${A}/FetchCleanupDemo.tsx`, `${B}/FetchWithoutCleanup.tsx`],
    tests: [`${A}/FetchCleanupDemo.test.tsx`],
    minReact: '16.8',
    support: {
      level: 'universal',
      notes: 'AbortController is available in all supported browsers and Node 18+.',
    },
    officialDocs: [
      {
        label: 'Fetching data with Effects',
        url: 'https://react.dev/learn/synchronizing-with-effects#fetching-data',
      },
      {
        label: 'MDN: AbortController',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/AbortController',
      },
    ],
    related: ['use-effect-race-conditions', 'tanstack-query', 'use'],
    concept:
      'Every effect run that starts a request must stop caring about it when the next run starts: abort it with `AbortController` (also cancels the network request) or set an `ignore` flag in the cleanup.',
    problem:
      'The mocked search answers shorter queries more slowly. Typing “ja” then “jav” makes the “ja” response arrive last and overwrite the correct results — the left panel of the demo reproduces this.',
    whenNotToUse: [
      'Hand-rolled effect fetching for app-wide server state — TanStack Query or SWR handle races, caching and retries.',
    ],
    mistakes: [
      {
        title: 'No cleanup',
        wrong: 'useEffect(() => {\n  fetch(url).then((r) => r.json()).then(setData);\n}, [url]);',
        why: 'Responses can resolve out of order; the slowest one wins.',
        right:
          'useEffect(() => {\n  const controller = new AbortController();\n  fetch(url, { signal: controller.signal })\n    .then((r) => r.json())\n    .then(setData, (e) => { if (!controller.signal.aborted) throw e; });\n  return () => controller.abort();\n}, [url]);',
      },
    ],
    testing:
      'An MSW gate holds the first query’s response until the second has answered; the naive panel then shows the stale “j” results while the aborting panel keeps “ja”.',
  },
  {
    id: 'object-deps-infinite-loop',
    title: 'Object dependencies causing infinite loops',
    section: 'anti-pattern',
    category: ANTI,
    level: 'intermediate',
    summary:
      'An object created during render is new every time; as an effect dependency with a setState inside, it loops forever.',
    tags: ['dependencies', 'infinite loop', 'useEffect', 'object identity', 'exhaustive-deps'],
    demo: `${A}/ObjectDepsDemo.tsx`,
    sources: [`${A}/ObjectDepsDemo.tsx`, `${B}/ObjectDepsLoop.tsx`],
    tests: [`${A}/ObjectDepsDemo.test.tsx`],
    minReact: '16.8',
    officialDocs: [
      {
        label: 'Does some reactive value change unintentionally?',
        url: 'https://react.dev/learn/removing-effect-dependencies#does-some-reactive-value-change-unintentionally',
      },
    ],
    related: ['memoization-pitfalls', 'use-memo', 'fetch-without-cleanup'],
    concept:
      'Depend on primitives and build objects inside the effect. The fixed product list depends on `[category, pageSize]` and only requests when one of them changes.',
    problem:
      'render → new `options` → effect runs → `setProducts` → render → new `options` → … an endless stream of requests. `exhaustive-deps` warns that the object changes on every render.',
    mistakes: [
      {
        title: 'Object created in render as a dependency',
        wrong:
          'const options = { category };\nuseEffect(() => load(options).then(setItems), [options]);',
        why: 'The dependency is never equal to the previous one.',
        right:
          'useEffect(() => {\n  const options = { category };\n  load(options).then(setItems);\n}, [category]);',
      },
    ],
    testing:
      'The test records MSW requests: unrelated re-renders make none, changing the page size makes exactly one more.',
  },
  {
    id: 'mutating-state',
    title: 'Mutating state',
    section: 'anti-pattern',
    category: ANTI,
    level: 'beginner',
    summary:
      'React compares state by reference; mutate in place and updates are skipped or leak into old renders.',
    tags: ['immutability', 'state updates', 'push', 'sort', 'toSorted', 'immer'],
    demo: `${A}/ImmutableUpdatesDemo.tsx`,
    sources: [`${A}/ImmutableUpdatesDemo.tsx`, `${B}/MutatingState.tsx`],
    tests: [`${A}/ImmutableUpdatesDemo.test.tsx`],
    minReact: '16.8',
    officialDocs: [
      {
        label: 'Updating arrays in state',
        url: 'https://react.dev/learn/updating-arrays-in-state',
      },
      PURITY_DOCS,
    ],
    related: ['use-state-immutable-updates', 'memo', 'eslint-plugin-react-hooks'],
    concept:
      'Treat state as read-only. Create new arrays and objects (`[...a, x]`, `map`, `filter`, `toSorted`, `{ ...obj }`) for every update; keep old versions untouched — which is also what makes undo trivial in the demo.',
    problem:
      '`todos.push(x); setTodos(todos)` passes the same reference, so React bails out. Mutating an object shared with the previous render corrupts memoised children and history, and sorting state in place during render is a side effect.',
    edgeCases: [
      '`react-hooks/immutability` reports direct assignments to state (`filters.showDone = …`), but not `push`/`sort` or writes to objects reached through `.map`/`.find`.',
      'For deeply nested updates Immer’s `produce` lets you write “mutations” against a draft safely.',
    ],
    testing:
      'Tests add, toggle and remove todos, sort a copy, and undo every step from kept snapshots.',
  },
  {
    id: 'index-as-key',
    title: 'Index as key for stateful items',
    section: 'anti-pattern',
    category: ANTI,
    level: 'beginner',
    summary:
      'With key={index}, inserting or removing items makes rows inherit another item’s state.',
    tags: ['keys', 'lists', 'reconciliation', 'state preservation', 'uncontrolled inputs'],
    demo: `${A}/ListKeysDemo.tsx`,
    sources: [`${A}/ListKeysDemo.tsx`, `${B}/IndexAsKey.tsx`],
    tests: [`${A}/ListKeysDemo.test.tsx`],
    minReact: '16.8',
    officialDocs: [
      {
        label: 'Rendering lists: keeping list items in order with key',
        url: 'https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key',
      },
    ],
    related: ['large-lists', 'rules-of-hooks'],
    concept:
      'Keys tell React which component instance belongs to which item. Use a stable id from the data; the index is only safe for static lists without state.',
    problem:
      'Insert at the top with index keys and React reuses row 0’s DOM and state for the new item: the note typed for Ada now sits next to “Guest 3”. No lint rule catches it.',
    mistakes: [
      {
        title: 'Random keys',
        wrong: 'items.map((item) => <Row key={Math.random()} item={item} />)',
        why: 'Every render remounts every row, losing all state and focus (and `react-hooks/purity` flags `Math.random()` in render).',
        right: 'items.map((item) => <Row key={item.id} item={item} />)',
      },
    ],
    testing:
      'With id keys the note stays with Ada after inserting at the top; with index keys it moves to the new guest, and removing the first row shifts it to Grace.',
  },
  {
    id: 'one-big-context',
    title: 'Putting everything in one context',
    section: 'anti-pattern',
    category: ANTI,
    level: 'intermediate',
    summary:
      'One context with a fresh object value re-renders every consumer on any change; split by concern.',
    tags: ['context', 'performance', 're-renders', 'provider value', 'state management'],
    demo: `${A}/SplitContextDemo.tsx`,
    sources: [`${A}/SplitContextDemo.tsx`, `${B}/OneBigContext.tsx`],
    tests: [`${A}/SplitContextDemo.test.tsx`],
    minReact: '19.0',
    support: {
      level: 'universal',
      notes:
        'Uses `<Context value>` as the provider (React 19); `<Context.Provider>` behaves the same.',
    },
    officialDocs: [
      {
        label: 'Optimizing re-renders when passing objects and functions',
        url: 'https://react.dev/reference/react/useContext#optimizing-re-renders-when-passing-objects-and-functions',
      },
    ],
    related: ['use-context-performance', 'use-context', 'state-management-comparison', 'zustand'],
    concept:
      'Every consumer of a context re-renders when its value changes (`Object.is`). Split contexts by how often they change, memoise each provider value, and keep fast-changing values local or in a store with selectors.',
    problem:
      'Typing in a search box stored in an app-wide context re-renders the avatar, the theme toggle and everything else that reads that context.',
    whenNotToUse: [
      'Splitting is not needed for small apps or values that rarely change (theme, locale, current user) — measure first.',
    ],
    testing:
      'With one context, three keystrokes re-render all three consumers; with split contexts only the search consumer re-renders, and toggling the theme re-renders only the theme consumer.',
  },
  {
    id: 'overusing-memoization',
    title: 'Overusing memoization',
    section: 'anti-pattern',
    category: ANTI,
    level: 'beginner',
    summary:
      'useMemo/useCallback on everything adds code and dependency bugs without making anything faster.',
    tags: ['useMemo', 'useCallback', 'premature optimization', 'react compiler'],
    demo: `${A}/OverMemoizedFixed.tsx`,
    sources: [`${A}/OverMemoizedFixed.tsx`, `${B}/OverMemoized.tsx`],
    tests: [`${A}/OverMemoizedFixed.test.tsx`],
    minReact: '16.8',
    officialDocs: [
      {
        label: 'Should you add useMemo everywhere?',
        url: 'https://react.dev/reference/react/useMemo#should-you-add-usememo-everywhere',
      },
    ],
    related: ['memoization-pitfalls', 'use-memo', 'use-callback', 'react-compiler'],
    concept:
      'Memoisation helps only when it skips expensive work or preserves an identity someone compares. The corrected counter removes four memos with no change in behaviour.',
    problem:
      'Reflexive memoisation makes code harder to read, adds dependency arrays that go stale, and costs a comparison on every render.',
    whenToUse: [
      'Keep memoisation for measured slow calculations, `memo` children and effect dependencies.',
      'With React Compiler enabled, let the compiler memoise and keep manual memos as escape hatches.',
    ],
    testing: 'The test exercises the de-memoised counter with both step sizes.',
  },
  {
    id: 'reading-refs-during-render',
    title: 'Reading refs during render',
    section: 'anti-pattern',
    category: ANTI,
    level: 'intermediate',
    summary:
      'ref.current is not reactive and may be written by renders React discards; read refs in handlers and effects.',
    tags: ['useRef', 'refs', 'render purity', 'concurrent rendering', 'react-hooks/refs'],
    demo: `${A}/RefsInRenderDemo.tsx`,
    sources: [`${A}/RefsInRenderDemo.tsx`, `${B}/RefsDuringRender.tsx`],
    tests: [`${A}/RefsInRenderDemo.test.tsx`],
    minReact: '16.8',
    officialDocs: [
      {
        label: 'useRef pitfalls: do not read or write ref.current during rendering',
        url: 'https://react.dev/reference/react/useRef#referencing-a-value-with-a-ref',
      },
      PURITY_DOCS,
    ],
    related: ['use-ref-vs-state', 'eslint-plugin-react-hooks', 'set-state-during-render'],
    concept:
      'Rendered values belong in state. Refs hold values that survive renders without triggering them (last click time, DOM nodes, timers) and are read and written in event handlers and effects.',
    problem:
      'A render counter in a ref counts renders React throws away (Strict Mode, interrupted transitions), and a value read from a ref during render is stale because changing it never re-renders. `react-hooks/refs` reports both.',
    edgeCases: [
      'Initialising a ref lazily (`if (ref.current === null) ref.current = create()`) is the one documented exception.',
    ],
    testing:
      'Tests check click stats come from state, the interval is computed in the handler, commits are counted from an effect, and a DOM ref is focused from a handler.',
  },
  {
    id: 'set-state-during-render',
    title: 'setState during render (render loops)',
    section: 'anti-pattern',
    category: ANTI,
    level: 'beginner',
    summary:
      'Unconditional setState while rendering loops until React throws “Too many re-renders”.',
    tags: ['setState', 'render loop', 'too many re-renders', 'onClick', 'derived state'],
    demo: `${A}/SetStateInRenderDemo.tsx`,
    sources: [`${A}/SetStateInRenderDemo.tsx`, `${B}/SetStateDuringRender.tsx`],
    tests: [`${A}/SetStateInRenderDemo.test.tsx`],
    minReact: '16.8',
    officialDocs: [
      {
        label: 'Storing information from previous renders',
        url: 'https://react.dev/reference/react/useState#storing-information-from-previous-renders',
      },
      {
        label: 'I’m getting an error: “Too many re-renders”',
        url: 'https://react.dev/reference/react/useState#im-getting-an-error-too-many-re-renders',
      },
    ],
    related: [
      'effect-chains-derived-state',
      'reading-refs-during-render',
      'eslint-plugin-react-hooks',
    ],
    concept:
      'Rendering must not schedule unconditional updates. Derive values instead of storing them, pass handlers as functions, and — only when state must reset as a prop changes — use the guarded “store the previous value” pattern (or a `key`).',
    problem:
      'Each setState in render schedules another render that calls setState again. Classic causes: copying a formatted prop into state, and `onClick={setSelected("buy")}` calling the setter instead of passing a function. `react-hooks/set-state-in-render` reports both.',
    mistakes: [
      {
        title: 'Calling the handler instead of passing it',
        wrong: '<button onClick={setSelected("buy")}>Buy</button>',
        why: 'Runs during render; React aborts with “Too many re-renders”.',
        right: '<button onClick={() => setSelected("buy")}>Buy</button>',
      },
    ],
    testing:
      'Tests check prices are derived from the currency and that the selection resets exactly once when the currency changes.',
  },
];
