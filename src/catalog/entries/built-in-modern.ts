import type { CatalogEntry } from '../types';

const M = 'examples/built-in/modern';
const CATEGORY = 'Modern React (19+)';
const REACT_19_POST = {
  label: 'React 19 release post',
  url: 'https://react.dev/blog/2024/12/05/react-19',
};

export const entries: CatalogEntry[] = [
  {
    id: 'use',
    title: 'use',
    section: 'built-in',
    category: CATEGORY,
    level: 'advanced',
    summary:
      'Read a promise (suspending until it settles) or a context — and, unlike Hooks, call it conditionally.',
    tags: ['use', 'suspense', 'promise', 'context', 'conditional', 'data fetching'],
    demo: `${M}/UseDemo.tsx`,
    sources: [
      `${M}/UseDemo.tsx`,
      `${M}/api.ts`,
      `${M}/ErrorBoundary.tsx`,
      'mocks/extra/modernHandlers.ts',
    ],
    tests: [`${M}/UseDemo.test.tsx`],
    minReact: '19.0',
    support: {
      level: 'universal',
      notes:
        'With streaming SSR / Server Components, a promise created on the server can be passed to a Client Component and read with `use`. Reading context with `use` is not supported in Server Components.',
    },
    officialDocs: [{ label: 'use', url: 'https://react.dev/reference/react/use' }, REACT_19_POST],
    related: ['suspense-error-boundary', 'use-transition-actions', 'use-context', 'tanstack-query'],
    concept:
      '`use(resource)` reads the value of a Promise or a Context. For a pending promise the component suspends (the nearest `<Suspense>` shows its fallback); a rejected promise throws to the nearest error boundary. `use` is an API, not a Hook: it may be called inside `if` and loops.',
    problem:
      'Fetching in effects means loading flags, race handling and waterfalls in every component. `useContext` cannot be called conditionally, which forces reading context you might not need.',
    whenToUse: [
      'Reading a promise that was created **outside render**: in an event handler (as the demo does), a router loader, a framework, a cache keyed by id, or a Server Component.',
      'Reading context only on some code paths (`if (showTheme) use(ThemeContext)`).',
    ],
    whenNotToUse: [
      'A promise created in the component body — a new promise every render suspends forever. React warns about uncached promises.',
      'As a full data layer: `use` has no caching, deduplication, revalidation or retries. Prefer TanStack Query / SWR or your framework’s loaders, which can integrate with Suspense.',
      'Inside `try/catch` — not supported; use an error boundary.',
    ],
    api: {
      signature: 'function use<T>(usable: Promise<T> | Context<T>): T',
      returns: 'The resolved value of the promise, or the context value.',
    },
    execution: [
      'Render: `use(promise)` returns the value if the promise already resolved; otherwise React suspends the component and shows the closest Suspense fallback.',
      'When the promise settles React retries the render. A rejection is thrown to the nearest error boundary.',
      'Inside a transition (the demo’s default), already-visible content stays on screen with `isPending` instead of falling back.',
    ],
    mistakes: [
      {
        title: 'Creating the promise during render',
        wrong:
          'function Profile({ id }) {\n  const user = use(fetch(`/api/users/${id}`).then((r) => r.json()));\n}',
        why: 'Every render creates a new promise, so the component suspends again and again.',
        right:
          'const cache = new Map();\nfunction getUser(id) {\n  if (!cache.has(id)) cache.set(id, fetchUser(id));\n  return cache.get(id);\n}\n// in an event handler: setUserPromise(getUser(id));',
      },
    ],
    edgeCases: [
      'The module cache evicts rejected promises so “Try again” can refetch; the error boundary resets when the promise changes (`resetKey`).',
      'In tests a synchronous `act()` drops renders that suspend on a pending promise; the tests leave the act environment and hold responses with an MSW “gate”.',
    ],
    testing:
      'Four tests: fallback then content without a transition, stale content plus `isPending` with one, conditional `use(Context)` updating with the provider, and a 404 shown by the error boundary followed by a successful retry.',
    diagram: {
      title: 'What use(promise) does during render',
      description:
        'A promise read with use either returns a value, suspends, or throws to an error boundary.',
      mermaid: [
        'flowchart TD',
        '  A[render calls use promise] --> B{promise state}',
        '  B -- fulfilled --> C[return value and continue rendering]',
        '  B -- pending --> D[suspend: nearest Suspense shows fallback]',
        '  D --> E[promise settles: React retries the render]',
        '  E --> B',
        '  B -- rejected --> F[throw: nearest error boundary renders]',
      ].join('\n'),
    },
  },
  {
    id: 'use-action-state',
    title: 'useActionState',
    section: 'built-in',
    category: CATEGORY,
    level: 'intermediate',
    summary:
      'State produced by an Action (often a form submission), with the pending flag built in.',
    tags: ['actions', 'forms', 'pending', 'useFormState', 'reducer', 'server functions'],
    demo: `${M}/UseActionStateDemo.tsx`,
    sources: [`${M}/UseActionStateDemo.tsx`, `${M}/api.ts`, 'mocks/extra/modernHandlers.ts'],
    tests: [`${M}/UseActionStateDemo.test.tsx`],
    minReact: '19.0',
    support: {
      level: 'universal',
      notes:
        'With a Server Function and `permalink`, a form can submit before JavaScript loads (progressive enhancement); `initialState` must then be serialisable.',
    },
    officialDocs: [
      { label: 'useActionState', url: 'https://react.dev/reference/react/useActionState' },
      REACT_19_POST,
    ],
    related: [
      'form-actions',
      'use-form-status',
      'use-optimistic',
      'use-transition-actions',
      'react-version-compatibility',
    ],
    concept:
      '`const [state, formAction, isPending] = useActionState(action, initialState)`. Calling `formAction(payload)` (or passing it to `<form action>`) runs `action(previousState, payload)` in a transition; its (awaited) return value becomes the new `state`.',
    problem:
      'Form submission code repeats the same pieces: `useState` for result and error, an `isSubmitting` flag, `preventDefault`, try/finally to reset the flag.',
    whenToUse: [
      'Forms whose result (success message, validation errors, the rejected input) should be shown next to the form.',
      'Any async “reducer” where each call needs the previous result — calls are queued and run in order.',
    ],
    whenNotToUse: [
      'Optimistic UI — combine with `useOptimistic`.',
      'Server cache state used across the app — a data library is a better home.',
      'Throwing for expected errors: a thrown error goes to the nearest error boundary and cancels queued actions; return errors as state instead (the demo does).',
    ],
    api: {
      signature:
        'function useActionState<State, Payload>(action: (state: Awaited<State>, payload: Payload) => State | Promise<State>, initialState: Awaited<State>, permalink?: string): [state: Awaited<State>, dispatch: (payload: Payload) => void, isPending: boolean]',
      returns: 'Current state, a stable dispatch/form action, and `isPending`.',
    },
    execution: [
      'Submit: React collects `FormData`, starts a transition and calls `action(previousState, formData)`; `isPending` becomes true.',
      'The action resolves → `state` is replaced with its return value and `isPending` turns false in the same commit.',
      'For `<form action>`, uncontrolled fields reset after a successful action — the demo feeds a rejected e-mail back via `defaultValue`.',
    ],
    mistakes: [
      {
        title: 'Using the removed Canary name',
        wrong: "import { useFormState } from 'react-dom';",
        why: 'Renamed to `useActionState` (from `react`) for React 19. react-dom still exports the old name but warns in development.',
        right: "import { useActionState } from 'react';",
      },
    ],
    testing:
      'The test holds the MSW response with a gate to assert “Subscribing…” and the disabled button, then the success message, the reset field and the attempt counter fed by the previous state; a 409 keeps the rejected address.',
  },
  {
    id: 'use-optimistic',
    title: 'useOptimistic',
    section: 'built-in',
    category: CATEGORY,
    level: 'advanced',
    summary:
      'Show the expected result of an Action immediately; React drops it automatically when the Action ends.',
    tags: ['optimistic ui', 'actions', 'rollback', 'todos', 'forms'],
    demo: `${M}/UseOptimisticDemo.tsx`,
    sources: [`${M}/UseOptimisticDemo.tsx`, `${M}/api.ts`],
    tests: [`${M}/UseOptimisticDemo.test.tsx`],
    minReact: '19.0',
    support: { level: 'universal' },
    officialDocs: [
      { label: 'useOptimistic', url: 'https://react.dev/reference/react/useOptimistic' },
      REACT_19_POST,
    ],
    related: [
      'use-action-state',
      'form-actions',
      'use-transition-actions',
      'use-optimistic-mutation',
    ],
    concept:
      '`const [optimistic, addOptimistic] = useOptimistic(state, reducer)`. While an Action is running, `addOptimistic(input)` renders `reducer(current, input)`. When the Action finishes React renders `state` again — so success shows the saved data and failure “rolls back” for free.',
    problem:
      'Waiting for the server makes simple interactions feel slow; hand-written optimistic updates need manual rollback and are easy to leave in an inconsistent state.',
    whenToUse: [
      'Likes, adding list items, renames — anything that usually succeeds and is cheap to undo visually.',
      'Inside an Action: a form `action`, `startTransition`, or `useActionState`’s dispatch.',
    ],
    whenNotToUse: [
      'Outside an Action — React warns and the optimistic value only flashes.',
      'Operations whose failure is common or costly (payments): show a pending state instead.',
      'Cache-wide optimistic updates across many components — TanStack Query’s `onMutate` / SWR’s `mutate` manage cache rollback for you.',
    ],
    api: {
      signature:
        'function useOptimistic<State, Action>(passthrough: State, reducer: (state: State, action: Action) => State): [State, (action: Action) => void]',
      returns:
        'The optimistic state (equal to `passthrough` when no Action is pending) and the setter.',
    },
    execution: [
      'Submit: the form action runs in a transition; `addOptimistic(title)` immediately renders the placeholder (“Saving…”).',
      'Success: `startTransition(() => setTodos([...todos, saved]))` — the real state and the end of the Action commit together, replacing the placeholder.',
      'Failure: the Action ends without updating `todos`; React renders the real list, so the placeholder disappears. The caught error is shown separately.',
    ],
    mistakes: [
      {
        title: 'Forgetting startTransition after await',
        wrong: 'const saved = await createTodo(title);\nsetTodos((t) => [...t, saved]);',
        why: 'Updates after `await` are not part of the Action, so the saved item and the end of the optimistic state can commit separately and flicker.',
        right:
          'const saved = await createTodo(title);\nstartTransition(() => setTodos((t) => [...t, saved]));',
      },
    ],
    edgeCases: [
      'If `state` changes while the Action is pending, React re-runs the reducer on top of the new state.',
      'Optimistic ids must be unique and distinguishable from server ids (`optimistic:<title>` in the demo).',
    ],
    testing:
      'An MSW gate keeps POST /api/todos pending: the test sees the optimistic item and “Saving…”, opens the gate with a 500 and asserts the error message and rollback; a success path and the default “fail” rule are covered too.',
    diagram: {
      title: 'Optimistic add with rollback',
      description: 'The optimistic item lives only while the Action is pending.',
      mermaid: [
        'sequenceDiagram',
        '  participant U as User',
        '  participant C as Component',
        '  participant S as Server',
        '  U->>C: submit "Write docs"',
        '  C->>C: addOptimistic (item shown as Saving)',
        '  C->>S: POST /api/todos',
        '  alt success',
        '    S-->>C: 201 saved todo',
        '    C->>C: startTransition(setTodos) then Action ends',
        '  else failure',
        '    S-->>C: 500',
        '    C->>C: show error, Action ends, item disappears',
        '  end',
      ].join('\n'),
    },
  },
  {
    id: 'use-form-status',
    title: 'useFormStatus',
    section: 'built-in',
    category: CATEGORY,
    level: 'intermediate',
    summary:
      'react-dom Hook that reads the pending status of the parent <form> — perfect for reusable submit buttons.',
    tags: ['forms', 'react-dom', 'pending', 'submit button', 'design system'],
    demo: `${M}/UseFormStatusDemo.tsx`,
    sources: [`${M}/UseFormStatusDemo.tsx`, `${M}/api.ts`],
    tests: [`${M}/UseFormStatusDemo.test.tsx`],
    minReact: '19.0',
    support: { level: 'universal', notes: 'Imported from `react-dom`, not `react`.' },
    officialDocs: [
      { label: 'useFormStatus', url: 'https://react.dev/reference/react-dom/hooks/useFormStatus' },
    ],
    related: ['form-actions', 'use-action-state'],
    concept:
      '`const { pending, data, method, action } = useFormStatus()` returns the status of the closest ancestor `<form>` whose `action` is a function — as if the form were a context provider.',
    problem:
      'A shared `<SubmitButton>` needs to know whether its form is submitting; without this you thread `isPending` props through every form.',
    whenToUse: ['Submit buttons, spinners or “Saving “Ada”…” labels rendered *inside* the form.'],
    whenNotToUse: [
      'In the component that renders the `<form>` — it never sees that form’s status (the demo shows `pending: false` there). Use `isPending` from `useActionState`/`useTransition` instead.',
      'For forms submitted with a plain `onSubmit` handler — only function `action`s are tracked.',
    ],
    api: {
      signature: 'function useFormStatus(): FormStatus',
      returns:
        '`{ pending: false, data: null, method: null, action: null }` or, while submitting, `{ pending: true, data: FormData, method: string, action }`.',
    },
    testing:
      'The test holds the save request: the button is disabled and labelled with the submitted name, the readout shows `pending: true`, method and FormData, and the form owner still reports `pending: false`; failure re-enables the button with an error.',
  },
  {
    id: 'form-actions',
    title: '<form action={fn}> Actions',
    section: 'built-in',
    category: CATEGORY,
    level: 'beginner',
    summary:
      'Pass a function to a form’s action: React calls it with FormData in a transition and resets the form.',
    tags: ['forms', 'actions', 'formAction', 'FormData', 'requestFormReset', 'react-dom'],
    demo: `${M}/FormActionsDemo.tsx`,
    sources: [`${M}/FormActionsDemo.tsx`],
    tests: [`${M}/FormActionsDemo.test.tsx`],
    minReact: '19.0',
    support: { level: 'universal' },
    officialDocs: [
      { label: '<form>', url: 'https://react.dev/reference/react-dom/components/form' },
    ],
    related: ['use-action-state', 'use-form-status', 'use-optimistic', 'use-form'],
    concept:
      '`<form action={fn}>` and `<button formAction={fn}>` call `fn(formData)` inside a transition when submitted. Actions may be sync or async. After the action completes successfully, uncontrolled fields are reset.',
    problem:
      'Classic forms need `onSubmit`, `preventDefault`, controlled inputs or manual `FormData` plumbing, and manual reset logic.',
    whenToUse: [
      'Uncontrolled forms that submit data and reset.',
      'Multiple submit buttons with different behaviour (`formAction`) — Post vs Save draft in the demo.',
    ],
    whenNotToUse: [
      'Forms with complex client validation, field arrays or per-keystroke feedback — a form library (React Hook Form) or controlled inputs fit better.',
      'When the user’s input must survive a validation error, the automatic reset gets in the way: return the values with `useActionState` and feed them back as `defaultValue`.',
    ],
    edgeCases: [
      'The reset also happens after an early `return` for invalid input — only a thrown error prevents it (and goes to an error boundary).',
      'Since 19.3 React fires `onReset` when it resets a form after a Server Action.',
    ],
    testing:
      'Tests submit via the real buttons and assert the FormData values, the per-button `formAction`, and the automatic reset (including the gotcha for rejected input).',
  },
  {
    id: 'suspense-error-boundary',
    title: 'Suspense + error boundaries for data',
    section: 'built-in',
    category: CATEGORY,
    level: 'advanced',
    summary:
      'Declare loading and error UI with boundaries; their placement decides reveal order and blast radius.',
    tags: ['suspense', 'error boundary', 'use', 'loading states', 'retry', 'dashboard'],
    demo: `${M}/SuspenseDataDemo.tsx`,
    sources: [
      `${M}/SuspenseDataDemo.tsx`,
      `${M}/ErrorBoundary.tsx`,
      `${M}/api.ts`,
      'mocks/extra/modernHandlers.ts',
    ],
    tests: [`${M}/SuspenseDataDemo.test.tsx`],
    minReact: '19.0',
    support: {
      level: 'universal',
      notes:
        'On the server, streaming SSR sends each Suspense fallback first and streams the content when ready (React 18+). Error boundaries are class components; there is no Hook equivalent.',
    },
    officialDocs: [
      { label: '<Suspense>', url: 'https://react.dev/reference/react/Suspense' },
      {
        label: 'Catching rendering errors with an error boundary',
        url: 'https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary',
      },
    ],
    related: ['use', 'use-transition-actions', 'activity'],
    concept:
      'Each widget reads its data with `use(promise)`. `<Suspense fallback>` shows a placeholder while any child is suspended; an error boundary renders a fallback when a child throws (including a rejected promise). The demo switches between one boundary per widget and one for the whole grid.',
    problem:
      'Ad-hoc `isLoading`/`error` flags in every component produce inconsistent spinners and one failing request blanking the whole page.',
    whenToUse: [
      'One boundary per independent region to stream content in; one shared boundary to reveal a group together and avoid layout “popcorn”.',
      'Error boundaries close to the data so one failing service does not take down the page; offer a retry that creates a new promise.',
    ],
    whenNotToUse: [
      'Errors from event handlers or code outside rendering — boundaries do not catch those; handle them where they happen.',
      'Suspense for data without a Suspense-enabled source (`use`, `lazy`, a supporting library) — data fetched in effects does not activate it.',
    ],
    edgeCases: [
      'Updates wrapped in a transition keep already-revealed content instead of re-showing fallbacks.',
      'React logs errors caught by boundaries via `console.error` (customisable with `onCaughtError` on the root).',
    ],
    testing:
      'Tests assert per-widget fallbacks then content, a single grouped fallback, and a failing stats widget isolated in its boundary that recovers via Retry.',
  },
  {
    id: 'use-transition-actions',
    title: 'Async transitions (Actions)',
    section: 'built-in',
    category: CATEGORY,
    level: 'intermediate',
    summary:
      'React 19: startTransition accepts async functions and keeps isPending true until they settle.',
    tags: ['useTransition', 'actions', 'async', 'isPending', 'mutations'],
    demo: `${M}/AsyncTransitionDemo.tsx`,
    sources: [`${M}/AsyncTransitionDemo.tsx`, `${M}/api.ts`],
    tests: [`${M}/AsyncTransitionDemo.test.tsx`],
    minReact: '19.0',
    support: { level: 'universal' },
    officialDocs: [
      {
        label: 'Functions called in startTransition are called “Actions”',
        url: 'https://react.dev/reference/react/useTransition#functions-called-in-starttransition-are-called-actions',
      },
      REACT_19_POST,
    ],
    related: ['use-transition', 'use-action-state', 'use-optimistic', 'use-async-fn'],
    concept:
      '`startTransition(async () => { await save(); startTransition(() => setSaved(...)) })`. By convention a function run in a transition is an *Action*. `isPending` is true from the call until the async function settles.',
    problem:
      'React 18 transitions had to be synchronous, so every mutation needed its own `isSaving` state, error state and cleanup.',
    whenToUse: [
      'Mutations triggered by buttons (save, rename, delete) where the UI should show a pending state.',
      'As the building block under form actions, `useActionState` and `useOptimistic`.',
    ],
    whenNotToUse: [
      'Updates that must be visible immediately (controlled inputs) — keep them outside the transition.',
      'Ignoring errors: an error thrown by the Action and not caught goes to the nearest error boundary.',
    ],
    edgeCases: [
      'State set after `await` must be wrapped in another `startTransition` (a current limitation of async context in JavaScript).',
      'Multiple pending Actions may be batched together.',
    ],
    testing:
      'An MSW gate holds the request: the test asserts “Action pending” and the disabled button, then the saved name and counter; a 500 shows the caught error and leaves the saved name unchanged.',
  },
  {
    id: 'activity',
    title: '<Activity>',
    section: 'built-in',
    category: CATEGORY,
    level: 'advanced',
    summary:
      'React 19.2: hide part of the UI while keeping its state and DOM, with its Effects cleaned up.',
    tags: ['Activity', 'tabs', 'keep alive', 'offscreen', 'pre-render', 'state preservation'],
    demo: `${M}/ActivityDemo.tsx`,
    sources: [`${M}/ActivityDemo.tsx`],
    tests: [`${M}/ActivityDemo.test.tsx`],
    minReact: '19.2',
    support: {
      level: 'universal',
      notes:
        'Exported from `react` and typed in `@types/react` 19.2+. With SSR, Activity boundaries take part in Selective Hydration, so React can hydrate other parts of the page first.',
    },
    officialDocs: [
      { label: '<Activity>', url: 'https://react.dev/reference/react/Activity' },
      { label: 'React 19.2 release post', url: 'https://react.dev/blog/2025/10/01/react-19-2' },
    ],
    related: ['suspense-error-boundary', 'view-transition', 'use-state-colocation'],
    concept:
      '`<Activity mode="visible" | "hidden">`. Hidden children get `display: none`, keep their state and DOM, and have their Effects destroyed; becoming visible restores them and re-creates the Effects. A boundary that starts hidden still renders (at low priority) but mounts no Effects.',
    problem:
      'Conditional rendering destroys a tab’s state (drafts, scroll, inputs) when you switch away; CSS hiding keeps subscriptions and timers running in the background.',
    whenToUse: [
      'Tabs, sidebars and wizards whose state should survive being hidden.',
      'Pre-rendering content the user will likely open next (data read with `use` is fetched while hidden).',
    ],
    whenNotToUse: [
      'Huge hidden trees that are rarely shown — they still cost memory and low-priority renders when props change.',
      'Components with DOM side effects that keep going while hidden (`<video>`, `<audio>`) unless a cleanup (preferably in `useLayoutEffect`) pauses them.',
    ],
    edgeCases: [
      'A hidden Activity whose child renders only text outputs nothing, since there is no element to hide.',
      'Strict Mode exercises hide/show cycles to reveal Effects without proper cleanup.',
    ],
    testing:
      'Tests type a draft, hide the tab (DOM present but not visible), and show it again with the draft intact; conditional rendering loses it. With fake intervals, the timer tab logs its effect start and cleanup and does not tick while hidden.',
  },
  {
    id: 'view-transition',
    title: '<ViewTransition> & addTransitionType',
    section: 'built-in',
    category: CATEGORY,
    level: 'advanced',
    summary:
      'React 19.3: animate updates made inside Transitions with the browser View Transition API.',
    tags: [
      'ViewTransition',
      'addTransitionType',
      'animation',
      'view transitions api',
      'reduced motion',
    ],
    demo: `${M}/ViewTransitionDemo.tsx`,
    sources: [`${M}/ViewTransitionDemo.tsx`, `${M}/ViewTransitionDemo.css`],
    tests: [`${M}/ViewTransitionDemo.test.tsx`],
    minReact: '19.3',
    support: {
      level: 'browser-limited',
      notes:
        'Needs `document.startViewTransition`; elsewhere React applies the update without animation. DOM only (not React Native).',
    },
    officialDocs: [
      { label: '<ViewTransition>', url: 'https://react.dev/reference/react/ViewTransition' },
      { label: 'addTransitionType', url: 'https://react.dev/reference/react/addTransitionType' },
      { label: 'React 19.3 release post', url: 'https://react.dev/blog/2026/09/09/react-19-3' },
      {
        label: 'MDN: View Transition API',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API',
      },
    ],
    related: ['use-transition', 'activity', 'react-version-compatibility'],
    concept:
      'Wrap UI in `<ViewTransition>`. When an update inside `startTransition`, `useDeferredValue` or a Suspense reveal enters, exits or changes it, React runs a view transition. `addTransitionType("forward")` inside `startTransition` lets `enter`/`exit` props pick a class per cause.',
    problem:
      'Animating between UI states (slides, route changes, list reorders) usually means a motion library and manual coordination of mount/unmount timing.',
    whenToUse: [
      'Navigation-like changes and content swaps that are already Transitions.',
      'Direction-aware animations: `enter={{ forward: "slide-from-right", backward: "slide-from-left" }}`.',
    ],
    whenNotToUse: [
      'Urgent updates (plain `setState`) — they never animate; that is by design.',
      'Without a reduced-motion fallback — React does not disable animations for `prefers-reduced-motion`; the demo’s CSS does.',
      'Animating many independent elements — a view transition animates snapshots, not each element’s layout.',
    ],
    edgeCases: [
      'A new `key` on the `<ViewTransition>` turns an update into an exit of the old element and an enter of the new one.',
      'jsdom has no View Transition API; the test covers the fallback path (updates still apply) rather than the animation.',
    ],
    testing:
      'Tests click Next/Previous with and without a transition and assert the slide content and the “not supported” notice.',
  },
  {
    id: 'fragment-refs',
    title: 'Fragment refs',
    section: 'built-in',
    category: CATEGORY,
    level: 'advanced',
    summary:
      'React 19.3: a ref on <Fragment> gives a FragmentInstance to focus, listen to and observe a group of siblings.',
    tags: ['Fragment', 'FragmentInstance', 'refs', 'focus management', 'ref cleanup'],
    demo: `${M}/FragmentRefDemo.tsx`,
    sources: [`${M}/FragmentRefDemo.tsx`],
    tests: [`${M}/FragmentRefDemo.test.tsx`],
    minReact: '19.3',
    support: {
      level: 'client-only',
      notes: 'The ref is attached on the client; FragmentInstance methods are DOM-only.',
    },
    officialDocs: [{ label: '<Fragment>', url: 'https://react.dev/reference/react/Fragment' }],
    related: ['ref-as-prop-and-cleanup', 'view-transition', 'react-version-compatibility'],
    concept:
      '`<Fragment ref={ref}>` (not the `<>` shorthand) provides a `FragmentInstance` acting on the Fragment’s first-level DOM children: `focus`, `focusLast`, `blur`, `addEventListener`/`removeEventListener`/`dispatchEvent`, `observeUsing`/`unobserveUsing`, `getClientRects`, `getRootNode`, `compareDocumentPosition`, `scrollIntoView`.',
    problem:
      'Acting on a group of siblings used to require a wrapper `<div>` (breaking layout or semantics) or every child forwarding a ref.',
    whenToUse: [
      'Focus management for a group (focus first/last), delegated listeners without a wrapper, visibility tracking of a component you do not own.',
    ],
    whenNotToUse: ['When a single element ref is enough — use a normal `ref`.'],
    edgeCases: [
      'The demo attaches the listener in a ref callback that returns a cleanup (React 19); `useCallback` keeps the callback stable so it is not detached and re-attached on every render.',
    ],
    testing:
      'Tests move focus with `focus()`/`focusLast()`, count clicks received through the FragmentInstance listener (but not clicks outside it), and spy on `removeEventListener` to verify the cleanup.',
  },
  {
    id: 'react-version-compatibility',
    title: 'React version compatibility',
    section: 'built-in',
    category: 'Compatibility',
    level: 'beginner',
    summary:
      'Every built-in Hook and API in this playground with the React version that introduced it — and what React 19 removed.',
    tags: [
      'versions',
      'migration',
      'react 18',
      'react 19',
      'react 19.2',
      'react 19.3',
      'deprecated',
      'removed',
    ],
    demo: `${M}/CompatibilityDemo.tsx`,
    sources: [`${M}/compatibilityData.ts`, `${M}/CompatibilityDemo.tsx`],
    tests: [`${M}/compatibilityData.test.ts`, `${M}/CompatibilityDemo.test.tsx`],
    minReact: '16.8',
    support: { level: 'universal' },
    officialDocs: [
      {
        label: 'React 19 upgrade guide',
        url: 'https://react.dev/blog/2024/04/25/react-19-upgrade-guide',
      },
      REACT_19_POST,
      { label: 'React 19.2', url: 'https://react.dev/blog/2025/10/01/react-19-2' },
      { label: 'React 19.3', url: 'https://react.dev/blog/2026/09/09/react-19-3' },
    ],
    related: [
      'use',
      'activity',
      'view-transition',
      'fragment-refs',
      'use-action-state',
      'react-compiler',
    ],
    concept:
      'A filterable table grouped by release: core (16.x), React 18, React 19 (incl. 19.1), 19.2, 19.3, and legacy APIs. The “Installed build” column checks each export against the modules loaded in the page. The data lives in `compatibilityData.ts` so docs can reuse it.',
    problem:
      'Tutorials mix APIs from different releases; copying a 19.2 API into an 18.x app fails at runtime, and old patterns (forwardRef, string refs, defaultProps on functions) linger after upgrades.',
    whenToUse: ['Checking whether an API is available in your React version before adopting it.'],
    edgeCases: [
      '19.3’s `browser()` (react-dom) is exported and stable but not demonstrated: it opts a subtree out of SSR, and this playground renders only on the client, so it would never suspend.',
      '`useFormState` is still exported by react-dom 19 as a deprecated alias that warns; `forwardRef` and `<Context.Provider>` still work but are no longer needed.',
      '`cache` and `cacheSignal` only do something in Server Components; `captureOwnerStack` exists only in development builds.',
    ],
    testing:
      'The data test asserts every listed export exists in the installed react/react-dom 19.3 and every “removed” export (render, hydrate, findDOMNode, unmountComponentAtNode) is really gone, and that demo links point at real catalog entries. The demo test renders every group’s rows and the filters.',
  },
];
