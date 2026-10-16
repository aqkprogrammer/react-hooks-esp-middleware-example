import type { CatalogEntry, DocLink } from '../types';

const USE_REF_DOCS: DocLink = { label: 'useRef', url: 'https://react.dev/reference/react/useRef' };
const REFS_LEARN_DOCS: DocLink = {
  label: 'Referencing values with refs',
  url: 'https://react.dev/learn/referencing-values-with-refs',
};
const DOM_REFS_DOCS: DocLink = {
  label: 'Manipulating the DOM with refs',
  url: 'https://react.dev/learn/manipulating-the-dom-with-refs',
};
const USE_SES_DOCS: DocLink = {
  label: 'useSyncExternalStore',
  url: 'https://react.dev/reference/react/useSyncExternalStore',
};

const DIR = 'examples/built-in/refs';

export const entries: CatalogEntry[] = [
  {
    id: 'use-ref-dom-and-values',
    title: 'useRef — DOM access, previous values & timer ids',
    section: 'built-in',
    category: 'Refs & identity',
    level: 'beginner',
    summary:
      'Focus the first invalid field, remember the previous value, and keep an interval id without re-rendering.',
    tags: ['useRef', 'focus management', 'DOM', 'previous value', 'interval id', 'forms'],
    demo: `${DIR}/UseRefDomDemo.tsx`,
    sources: [`${DIR}/UseRefDomDemo.tsx`],
    tests: [`${DIR}/UseRefDomDemo.test.tsx`],
    minReact: '16.8',
    support: { level: 'universal' },
    officialDocs: [USE_REF_DOCS, DOM_REFS_DOCS, REFS_LEARN_DOCS],
    related: ['use-ref-vs-state', 'ref-as-prop-and-cleanup', 'use-imperative-handle', 'use-latest'],
    concept:
      '`useRef(initial)` returns the same mutable `{ current }` object on every render. Attach it to an element with `ref={...}` and React sets `current` to the DOM node after commit; or store any value that must survive renders without triggering one.',
    problem:
      'Some work is imperative (focus, scroll, measure, clear a timer) and some values are not for rendering (an interval id). State would cause useless re-renders; a local variable is lost on the next render.',
    whenToUse: [
      'Focus, selection, scrolling, media playback, measuring.',
      'Ids of timers, subscriptions and requests that handlers need to cancel.',
      'The previous value of a prop, read in an effect or handler.',
    ],
    whenNotToUse: [
      'Anything the UI displays — it will not update. Use state.',
      'Displaying the previous value — store it in state and update it during render when the prop changes (shown in the demo).',
    ],
    api: {
      signature: 'function useRef<T>(initialValue: T): RefObject<T>',
      params: [
        {
          name: 'initialValue',
          type: 'T',
          description:
            'Value of `current` on the first render; ignored afterwards. Use `null` for DOM refs.',
        },
      ],
      returns:
        "The same `{ current: T }` object for the component's lifetime. In React 19 types, `useRef` always requires an argument and `current` is mutable.",
    },
    execution: [
      'Render: returns the same object; reading or writing `current` here is not allowed (rendering must be pure).',
      'Commit: React sets DOM refs to their nodes (and to `null`/cleanup on removal).',
      'Effects and event handlers read and write `current` freely; changes do not re-render.',
    ],
    mistakes: [
      {
        title: 'Reading a ref during render',
        wrong: 'return <p>Previous: {prevRef.current}</p>;',
        why: 'Rendering would depend on a value React does not track; it may show stale data. `react-hooks/refs` reports it.',
        right:
          'const [tracked, setTracked] = useState({ value, previous: null });\nif (tracked.value !== value) setTracked({ value, previous: tracked.value });',
      },
      {
        title: 'Focusing during render',
        wrong: 'inputRef.current?.focus(); // in the component body',
        why: 'The node may not exist yet, and side effects in render break concurrent rendering.',
        right: 'onSubmit={() => inputRef.current?.focus()}',
      },
    ],
    edgeCases: [
      'Refs to conditionally rendered elements are `null` while hidden — always use optional chaining.',
      'Read the ref object (not `.current`) into a variable in an effect when the cleanup must see the latest value.',
    ],
    testing:
      'The demo test submits an invalid form and asserts focus moves to the first invalid field with an error description, checks the previous value table and change log, and drives the auto-saver with fake timers, asserting no timers remain after stop and unmount.',
    production: [
      'Move focus deliberately after validation errors and dialogs — it is an accessibility requirement, not a nicety.',
    ],
  },
  {
    id: 'use-ref-vs-state',
    title: 'useRef vs useState — mutable values that do not re-render',
    section: 'built-in',
    category: 'Refs & identity',
    level: 'beginner',
    summary:
      'Two counters side by side: state re-renders on every click, a ref changes silently and is read from a handler.',
    tags: ['useRef', 'useState', 're-render', 'mutable', 'render count'],
    demo: `${DIR}/UseRefVsStateDemo.tsx`,
    sources: [`${DIR}/UseRefVsStateDemo.tsx`],
    tests: [`${DIR}/UseRefVsStateDemo.test.tsx`],
    minReact: '16.8',
    support: { level: 'universal' },
    officialDocs: [
      {
        label: 'Differences between refs and state',
        url: 'https://react.dev/learn/referencing-values-with-refs#differences-between-refs-and-state',
      },
      USE_REF_DOCS,
    ],
    related: ['use-ref-dom-and-values', 'use-state-fundamentals'],
    concept:
      'State is a snapshot that triggers a re-render when set. A ref is a mutable box: writing `ref.current` is immediate, never re-renders, and the latest value is visible to every handler.',
    problem:
      'Using state for values the UI never shows costs renders; using refs for values the UI shows leaves the screen out of date.',
    whenToUse: ['Use a ref for values only handlers/effects read; state for everything rendered.'],
    whenNotToUse: ['Never mirror state into a ref "to avoid renders" if the UI needs the value.'],
    api: {
      signature: 'countRef.current += 1; // no re-render\nsetCount((c) => c + 1); // re-render',
    },
    execution: [
      'Clicking the state counter schedules a render → new snapshot → `<Profiler>` reports a commit.',
      'Clicking the ref counter mutates `current` → nothing renders.',
      '"Read the ref" logs the up-to-date `current` from an event handler.',
    ],
    mistakes: [
      {
        title: 'Rendering a ref',
        wrong: '<p>Clicked {countRef.current} times</p>',
        why: 'The text only updates when something else causes a render.',
        right: 'const [count, setCount] = useState(0);\n<p>Clicked {count} times</p>',
      },
    ],
    edgeCases: ['Refs are per component instance; two mounted counters have two refs.'],
    testing:
      'The test clicks both counters three times and asserts commit counts (4 vs 1), then reads the ref from a handler and asserts the logged value is current while the ref panel still committed once.',
    production: ['Profile before converting state to refs for performance — clarity first.'],
  },
  {
    id: 'use-ref-canvas',
    title: 'useRef — canvas drawing',
    section: 'built-in',
    category: 'Refs & identity',
    level: 'intermediate',
    summary:
      'Draw with pointer events through a canvas ref; the in-progress stroke lives in a ref, the stroke count in state.',
    tags: ['canvas', 'useRef', 'pointer events', 'imperative API', 'drawing'],
    demo: `${DIR}/UseRefCanvasDemo.tsx`,
    sources: [`${DIR}/UseRefCanvasDemo.tsx`, `${DIR}/UseRefCanvasDemo.css`],
    tests: [`${DIR}/UseRefCanvasDemo.test.tsx`],
    minReact: '16.8',
    support: {
      level: 'browser-limited',
      notes: 'Falls back to a message when `getContext("2d")` returns null.',
    },
    officialDocs: [
      USE_REF_DOCS,
      {
        label: 'MDN: Canvas API',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API',
      },
    ],
    related: ['use-ref-dom-and-values', 'use-ref-imperative-widgets'],
    concept:
      'React renders the `<canvas>` element; your code owns its pixels. Handlers get the element from the ref and call the Canvas 2D API. Values that change on every pointer move (the last point) live in a ref, so drawing never re-renders.',
    problem:
      'Storing the pointer position in state would re-render the component dozens of times per second while drawing, for no visible benefit.',
    whenToUse: ['Canvas, WebGL, video/audio elements and other imperative DOM APIs.'],
    whenNotToUse: [
      'Charts and diagrams that can be SVG/DOM — declarative markup is accessible and testable.',
    ],
    api: { signature: 'const context = canvasRef.current?.getContext("2d");' },
    execution: [
      '`pointerdown`: get the context, capture the pointer, remember the start point in a ref.',
      "`pointermove`: draw a segment from the ref's point to the new one, update the ref.",
      '`pointerup/cancel/leave`: clear the ref and increment the stroke count (state).',
    ],
    mistakes: [
      {
        title: 'Pointer position in state',
        wrong: 'onPointerMove={(e) => setLast({ x: e.clientX, y: e.clientY })}',
        why: 'A render per move event; drawing becomes janky.',
        right: 'onPointerMove={(e) => { draw(lastRef.current, e); lastRef.current = point(e); }}',
      },
      {
        title: 'Ignoring CSS scaling',
        wrong: 'context.lineTo(event.offsetX, event.offsetY);',
        why: 'The canvas bitmap (width/height attributes) and its CSS size differ; strokes land in the wrong place.',
        right: 'const scale = canvas.width / canvas.getBoundingClientRect().width;',
      },
    ],
    edgeCases: [
      '`touch-action: none` stops touch scrolling while drawing; pointer capture keeps the stroke when the pointer leaves the canvas.',
      'Canvas content is invisible to assistive technology: the demo exposes a label with the stroke count and a keyboard-operable "Draw a spiral".',
    ],
    testing:
      'jsdom has no canvas, so the test installs a recording 2D context via `vi.spyOn(HTMLCanvasElement.prototype, "getContext")`, then asserts `moveTo/lineTo/stroke/clearRect` calls, the brush width and the stroke count; a second test covers the unsupported (null context) path.',
    production: [
      'Scale the backing store by `devicePixelRatio` for sharp lines on high-DPI screens.',
    ],
  },
  {
    id: 'use-ref-imperative-widgets',
    title: 'useRef — integrating imperative third-party widgets',
    section: 'built-in',
    category: 'Refs & identity',
    level: 'intermediate',
    summary:
      'Wrap a vanilla-JS widget: container ref, instance ref, create/destroy effect, sync effect and a latest-callback ref.',
    tags: [
      'third-party',
      'imperative',
      'widget',
      'integration',
      'useRef',
      'cleanup',
      'latest callback',
    ],
    demo: `${DIR}/UseRefImperativeWidgetDemo.tsx`,
    sources: [
      `${DIR}/UseRefImperativeWidgetDemo.tsx`,
      `${DIR}/starRatingWidget.ts`,
      `${DIR}/UseRefImperativeWidgetDemo.css`,
    ],
    tests: [`${DIR}/UseRefImperativeWidgetDemo.test.tsx`],
    minReact: '16.8',
    support: { level: 'client-only' },
    officialDocs: [
      {
        label: 'Controlling a non-React widget',
        url: 'https://react.dev/learn/synchronizing-with-effects#controlling-non-react-widgets',
      },
      USE_REF_DOCS,
    ],
    related: ['use-ref-canvas', 'use-latest', 'use-effect-event', 'use-imperative-handle'],
    concept:
      "React renders an empty container and never touches its children. An effect creates the widget inside it and destroys it in the cleanup; a second effect pushes changing values through the widget's setter; a ref routes the widget's callback to the latest `onChange` prop.",
    problem:
      'Maps, charts, editors and date pickers own their DOM. Recreating them on every prop change is slow and loses internal state; never destroying them leaks memory and listeners.',
    whenToUse: ['Any non-React library with a create/update/destroy API.'],
    whenNotToUse: ['When an official React binding exists and is maintained — prefer it.'],
    api: {
      signature:
        'useEffect(() => {\n  const widget = create(containerRef.current!, { onChange: (v) => onChangeRef.current(v) });\n  widgetRef.current = widget;\n  return () => widget.destroy();\n}, [creationOptions]);',
    },
    execution: [
      'Mount: create effect builds the widget; the sync effect (declared after it) sets the initial value.',
      'React value changes: only the sync effect runs → `widget.setValue(value)`.',
      'Creation-only option changes (`max`): cleanup destroys, setup recreates, sync effect re-applies the value.',
      'Widget click: calls `onChangeRef.current`, which is the latest prop because a layout effect updates it after every commit.',
    ],
    mistakes: [
      {
        title: 'Recreating on every callback change',
        wrong:
          'useEffect(() => {\n  const w = create(el, { onChange });\n  return () => w.destroy();\n}, [onChange]);',
        why: 'An inline `onChange` prop changes every parent render, so the widget is destroyed and rebuilt constantly.',
        right: '// keep onChange in a ref (or an Effect Event in React 19.2+) and create once',
      },
      {
        title: "Letting React render inside the widget's container",
        wrong: '<div ref={containerRef}>{children}</div>',
        why: 'React and the widget both mutate the same DOM and corrupt each other.',
        right: '<div ref={containerRef} /> // empty; the widget owns it',
      },
    ],
    edgeCases: [
      'Strict Mode creates, destroys and recreates the widget on mount in development — destroy must fully clean up.',
      'If the widget calls back synchronously during creation, guard against state updates before mount completes.',
    ],
    testing:
      'The test pushes values from React into the widget, clicks a star and asserts React state updates, switches the star count and asserts exactly one widget exists afterwards with the value preserved, and unmounts to check the widget DOM is removed.',
    production: [
      'Wrap each widget once in a typed component and reuse it; keep the library behind a dynamic import if it is large.',
    ],
  },
  {
    id: 'ref-as-prop-and-cleanup',
    title: 'Refs in React 19 — ref as a prop & ref callback cleanup',
    section: 'built-in',
    category: 'Refs & identity',
    level: 'intermediate',
    summary:
      'Pass `ref` to function components without forwardRef, and return a cleanup from ref callbacks to track nodes in a Map.',
    tags: ['React 19', 'ref as prop', 'forwardRef', 'ref callback', 'cleanup', 'Map of refs'],
    demo: `${DIR}/UseRefReact19Demo.tsx`,
    sources: [`${DIR}/UseRefReact19Demo.tsx`],
    tests: [`${DIR}/UseRefReact19Demo.test.tsx`],
    minReact: '19.0',
    support: { level: 'universal' },
    officialDocs: [
      {
        label: 'React 19: ref as a prop',
        url: 'https://react.dev/blog/2024/12/05/react-19#ref-as-a-prop',
      },
      {
        label: 'React 19: cleanup functions for refs',
        url: 'https://react.dev/blog/2024/12/05/react-19#cleanup-functions-for-refs',
      },
      DOM_REFS_DOCS,
    ],
    related: ['use-ref-dom-and-values', 'use-imperative-handle'],
    concept:
      'In React 19 function components receive `ref` as a normal prop, so `forwardRef` is no longer needed. Ref callbacks may return a cleanup function, which React calls when the element is removed (instead of calling the callback with `null`).',
    problem:
      '`forwardRef` wrappers added boilerplate and awkward typings. Ref callbacks had to handle `null` to undo their work, which made per-item registration (a Map of nodes) clumsy.',
    whenToUse: [
      'Design-system components that expose their DOM node: `function Input({ ref, ...props })`.',
      'Lists that need a node per item (scroll-to, measuring, observers) — register in a ref callback, unregister in its cleanup.',
    ],
    whenNotToUse: ['Libraries that must support React 18 — keep `forwardRef` there.'],
    api: {
      signature:
        'function FancyInput({ ref, ...props }: { ref?: Ref<HTMLInputElement> }) { … }\n<li ref={(node) => { map.set(id, node); return () => map.delete(id); }} />',
    },
    execution: [
      'Commit: React calls each ref callback with its node; a returned function is stored as the cleanup.',
      'When the element unmounts, or the callback identity changes, React calls the stored cleanup.',
      'Callbacks that return nothing still receive `null` on detach, as before.',
    ],
    mistakes: [
      {
        title: 'Inline ref callbacks with side effects',
        wrong: '<li ref={(node) => register(item.id, node)} />',
        why: 'A new function each render → cleanup + setup on every render.',
        right:
          'const ref = useCallback((node: HTMLLIElement) => register(item.id, node), [register, item.id]);\n<li ref={ref} />',
      },
      {
        title: 'Still reaching for forwardRef',
        wrong:
          'const Input = forwardRef<HTMLInputElement, Props>((props, ref) => <input ref={ref} {...props} />);',
        why: 'Unnecessary in React 19 and planned for deprecation.',
        right:
          'function Input({ ref, ...props }: Props & { ref?: Ref<HTMLInputElement> }) {\n  return <input ref={ref} {...props} />;\n}',
      },
    ],
    edgeCases: [
      'TypeScript: returning anything other than a function from a ref callback is rejected by the React 19 types, so implicit returns like `ref={(n) => (instance = n)}` need braces.',
      'Class components still receive `ref` as the instance, not as a prop.',
    ],
    testing:
      'Tests focus and select through a ref passed as a prop, assert each row registers exactly once even when the list re-renders, that removing a row runs only its cleanup, and that the node Map is used to focus an item.',
    production: [
      'Migrate `forwardRef` components gradually; both styles interoperate in React 19.',
    ],
  },
  {
    id: 'use-imperative-handle',
    title: 'useImperativeHandle — a small imperative API',
    section: 'built-in',
    category: 'Refs & identity',
    level: 'advanced',
    summary:
      'A custom input exposes only `focus`, `clear` and `shake` to its parent instead of its DOM node.',
    tags: ['useImperativeHandle', 'ref', 'imperative', 'focus', 'animation', 'encapsulation'],
    demo: `${DIR}/UseImperativeHandleDemo.tsx`,
    sources: [`${DIR}/UseImperativeHandleDemo.tsx`, `${DIR}/UseImperativeHandleDemo.css`],
    tests: [`${DIR}/UseImperativeHandleDemo.test.tsx`],
    minReact: '19.0',
    support: {
      level: 'universal',
      notes:
        'The hook exists since 16.8; this demo receives `ref` as a prop, which needs React 19 (use `forwardRef` before).',
    },
    officialDocs: [
      {
        label: 'useImperativeHandle',
        url: 'https://react.dev/reference/react/useImperativeHandle',
      },
    ],
    related: ['ref-as-prop-and-cleanup', 'use-ref-dom-and-values', 'use-ref-imperative-widgets'],
    concept:
      "`useImperativeHandle(ref, create, deps)` sets what the parent's ref receives. Returning a small object of methods gives parents a deliberate API while the component keeps its DOM private.",
    problem:
      "Forwarding the raw `<input>` lets parents read and write anything — value, styles, listeners — behind React's back, and couples them to the markup.",
    whenToUse: [
      'Actions that are not state: focus, scroll into view, play/pause, trigger an animation.',
    ],
    whenNotToUse: [
      'Anything expressible as props (`isOpen`, `value`). Imperative handles are an escape hatch.',
    ],
    api: {
      signature:
        'function useImperativeHandle<T, R extends T>(ref: Ref<T> | undefined, create: () => R, deps?: DependencyList): void',
      params: [
        { name: 'ref', type: 'Ref<T>', description: 'The `ref` prop received from the parent.' },
        { name: 'create', type: '() => R', description: 'Returns the handle object.' },
        {
          name: 'deps',
          type: 'unknown[]',
          description: 'Recreate the handle when these change; omit to recreate every render.',
          optional: true,
        },
      ],
    },
    execution: [
      "Commit (layout phase): React calls `create()` and assigns the result to the parent's ref.",
      'Deps change: the handle is recreated and reassigned.',
      "Unmount: the parent's ref is reset to `null`.",
    ],
    mistakes: [
      {
        title: 'Exposing the whole DOM node through the handle',
        wrong: 'useImperativeHandle(ref, () => inputRef.current!, []);',
        why: 'Same as forwarding the node — no encapsulation gained.',
        right:
          'useImperativeHandle(ref, () => ({\n  focus: () => inputRef.current?.focus(),\n  shake: () => setShakes((n) => n + 1),\n}), []);',
      },
      {
        title: 'Using a handle for state',
        wrong: 'modalRef.current.open();',
        why: 'Whether a modal is open is state; imperative toggles fall out of sync with React.',
        right: '<Modal isOpen={isOpen} onClose={() => setIsOpen(false)} />',
      },
    ],
    edgeCases: [
      'Restarting a CSS animation: the demo alternates two identical keyframe names so repeated `shake()` calls replay it.',
      'Under `prefers-reduced-motion` the shake becomes a static outline.',
    ],
    testing:
      'The test submits an invalid code and asserts the input is focused and the shake class applied (and alternated on a second shake), and calls each handle method from buttons.',
    production: [
      'Type the handle (`ShakeInputHandle`) and export it so parents use `useRef<ShakeInputHandle>(null)`.',
    ],
  },
  {
    id: 'use-sync-external-store',
    title: 'useSyncExternalStore — shared external store',
    section: 'built-in',
    category: 'External stores',
    level: 'advanced',
    summary:
      'A module-level store shared by independent components, each subscribed to a slice, plus the mutable-snapshot pitfall.',
    tags: [
      'useSyncExternalStore',
      'external store',
      'subscribe',
      'getSnapshot',
      'selector',
      'tearing',
    ],
    demo: `${DIR}/UseSyncExternalStoreDemo.tsx`,
    sources: [`${DIR}/cartStore.ts`, `${DIR}/UseSyncExternalStoreDemo.tsx`],
    tests: [`${DIR}/UseSyncExternalStoreDemo.test.tsx`],
    minReact: '18.0',
    support: { level: 'universal' },
    officialDocs: [USE_SES_DOCS],
    related: [
      'use-sync-external-store-browser',
      'use-context-performance',
      'use-debug-value',
      'use-local-storage',
    ],
    concept:
      '`useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)` reads a value owned outside React and re-renders when the store notifies and the snapshot changed (`Object.is`). It is safe under concurrent rendering (no tearing).',
    problem:
      'Syncing an external store into state with an effect renders stale values first and can "tear" during concurrent renders (different components showing different versions).',
    whenToUse: [
      'Module-level stores, state libraries and browser APIs that expose subscribe + read.',
      'Fine-grained subscriptions: each component selects only the slice it renders.',
    ],
    whenNotToUse: [
      'State owned by React components — `useState`/`useReducer`.',
      'You need middleware, devtools and derived selectors at scale — Zustand, Redux or Jotai are built on this hook.',
    ],
    api: {
      signature:
        'function useSyncExternalStore<Snapshot>(subscribe: (onStoreChange: () => void) => () => void, getSnapshot: () => Snapshot, getServerSnapshot?: () => Snapshot): Snapshot',
      params: [
        {
          name: 'subscribe',
          type: '(onStoreChange) => unsubscribe',
          description: 'Keep it stable (module-level); a new function re-subscribes every render.',
        },
        {
          name: 'getSnapshot',
          type: '() => Snapshot',
          description: 'Must return the same value until the store changes.',
        },
        {
          name: 'getServerSnapshot',
          type: '() => Snapshot',
          description: 'Used on the server and during hydration.',
          optional: true,
        },
      ],
    },
    execution: [
      'Render: React calls `getSnapshot()` (possibly several times) and renders with the result.',
      'Commit: React subscribes; if the store changed in between, it re-renders synchronously.',
      'Store notifies → React calls `getSnapshot()`; a different value schedules a re-render of that component only.',
      'Unmount: the unsubscribe function runs.',
    ],
    mistakes: [
      {
        title: 'getSnapshot returns a new object every time',
        wrong:
          'useSyncExternalStore(store.subscribe, () => store.getSnapshot().items.filter((i) => i.qty > 1));',
        why: 'Every call looks like a change → React throws "The result of getSnapshot should be cached to avoid an infinite loop".',
        right:
          'const items = useSyncExternalStore(store.subscribe, () => store.getSnapshot().items);\nconst bulk = items.filter((i) => i.qty > 1); // derive in render',
      },
      {
        title: 'Mutating the snapshot',
        wrong: 'state.items.push(item);\nemit();',
        why: "Same reference → React sees no change and skips the render (the demo's bug button).",
        right: 'state = { ...state, items: [...state.items, item] };\nemit();',
      },
      {
        title: 'Inline subscribe function',
        wrong: 'useSyncExternalStore((cb) => store.subscribe(cb), store.getSnapshot);',
        why: 'A new `subscribe` each render makes React unsubscribe and resubscribe every time.',
        right: 'useSyncExternalStore(store.subscribe, store.getSnapshot);',
      },
    ],
    edgeCases: [
      'Updates from the store are synchronous (not transitions); expensive re-renders block input.',
      'Selectors returning primitives (a total) are naturally stable; for objects, memoise per state or select an existing branch.',
    ],
    testing:
      'Tests cover the store (notify only on change, unsubscribe), shared updates across components, exact commit counts per slice, the mutation pitfall (no re-render until the next real update) and that every subscription is removed on unmount.',
    production: [
      'Reset module-level stores between tests and requests; on the server, never share user data through module state.',
    ],
  },
  {
    id: 'use-sync-external-store-browser',
    title: 'useSyncExternalStore — browser state & SSR',
    section: 'built-in',
    category: 'External stores',
    level: 'intermediate',
    summary:
      'Subscribe to `navigator.onLine` and `document.visibilityState` with server snapshots that make SSR and hydration safe.',
    tags: [
      'useSyncExternalStore',
      'navigator.onLine',
      'visibilitychange',
      'SSR',
      'getServerSnapshot',
      'hydration',
    ],
    demo: `${DIR}/UseSyncExternalStoreBrowserDemo.tsx`,
    sources: [`${DIR}/browserStores.ts`, `${DIR}/UseSyncExternalStoreBrowserDemo.tsx`],
    tests: [
      `${DIR}/UseSyncExternalStoreBrowserDemo.test.tsx`,
      `${DIR}/UseSyncExternalStoreBrowserDemo.ssr.test.tsx`,
    ],
    minReact: '18.0',
    support: {
      level: 'universal',
      notes:
        'Renders "online, visible" on the server and switches to the real values after hydration.',
    },
    officialDocs: [
      {
        label: 'useSyncExternalStore: subscribing to a browser API',
        url: 'https://react.dev/reference/react/useSyncExternalStore#subscribing-to-a-browser-api',
      },
      {
        label: 'MDN: Navigator.onLine',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine',
      },
    ],
    related: ['use-sync-external-store', 'use-debug-value', 'use-media-query'],
    concept:
      'Browser state is an external store: `subscribe` adds the event listeners, `getSnapshot` reads the current value, `getServerSnapshot` returns a safe default for server rendering and hydration.',
    problem:
      'Reading `navigator.onLine` during render crashes on the server and causes hydration mismatches; copying it into state in an effect renders a wrong first frame.',
    whenToUse: [
      'Online status, visibility, media queries, `localStorage`, history/location — anything with a read + change event.',
    ],
    whenNotToUse: [
      'Values without a change event (e.g. `window.innerWidth` without listening to `resize`) — there is nothing to subscribe to.',
    ],
    api: {
      signature: 'useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true)',
    },
    execution: [
      'Server: React renders with `getServerSnapshot()`.',
      'Hydration: the client renders with `getServerSnapshot()` too, so markup matches; then it re-renders with `getSnapshot()` if different.',
      'Client: online/offline/visibilitychange events notify React, which re-reads the snapshot.',
    ],
    mistakes: [
      {
        title: 'No getServerSnapshot',
        wrong: 'useSyncExternalStore(subscribeOnline, () => navigator.onLine);',
        why: 'Server rendering throws: "Missing getServerSnapshot".',
        right: 'useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);',
      },
      {
        title: 'Effect + state',
        wrong:
          "const [online, setOnline] = useState(navigator.onLine);\nuseEffect(() => {\n  const update = () => setOnline(navigator.onLine);\n  window.addEventListener('online', update);\n  window.addEventListener('offline', update);\n  return () => { /* … */ };\n}, []);",
        why: 'Touches `navigator` during render (SSR crash) and misses changes between render and subscription.',
        right:
          'const online = useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getOnlineServerSnapshot);',
      },
    ],
    edgeCases: [
      '`navigator.onLine === true` only means "connected to a network", not "the API is reachable".',
      'Several components share the same module-level functions; each subscription is cleaned up on unmount.',
    ],
    testing:
      'The jsdom test overrides `navigator.onLine`/`document.visibilityState` and dispatches events, asserting both subscribers update and listeners are removed on unmount. A `*.ssr.test.tsx` renders the demo with `renderToString` in Node and asserts the server snapshots.',
    production: [
      'Pair the online flag with real request failures (retry/backoff) for a reliable offline UI.',
    ],
  },
  {
    id: 'use-id',
    title: 'useId — accessible ids for reusable components',
    section: 'built-in',
    category: 'Refs & identity',
    level: 'beginner',
    summary:
      'Unique, SSR-stable ids that wire labels, hints and errors to inputs — in as many instances as you render.',
    tags: ['useId', 'accessibility', 'aria-describedby', 'htmlFor', 'SSR', 'hydration', 'forms'],
    demo: `${DIR}/UseIdDemo.tsx`,
    sources: [`${DIR}/UseIdDemo.tsx`],
    tests: [`${DIR}/UseIdDemo.test.tsx`],
    minReact: '18.0',
    support: { level: 'universal' },
    officialDocs: [
      { label: 'useId', url: 'https://react.dev/reference/react/useId' },
      {
        label: 'React changelog (19.1 and 19.2 id format changes)',
        url: 'https://github.com/facebook/react/blob/main/CHANGELOG.md',
      },
    ],
    related: ['use-ref-dom-and-values', 'use-sync-external-store-browser'],
    concept:
      "`useId()` returns a string unique to this component instance and identical on the server and the client, because it is derived from the component's position in the tree.",
    problem:
      'Hard-coded ids collide when a component renders twice; counters and `Math.random()` differ between server and client and break hydration.',
    whenToUse: [
      '`htmlFor`/`id`, `aria-describedby`, `aria-labelledby`, `aria-controls` inside reusable components.',
      'Derive several related ids from one call: `${id}-hint`, `${id}-error`.',
    ],
    whenNotToUse: [
      'List keys — keys must come from data.',
      'Ids for data you create (todos, uploads) — generate them in the event handler, e.g. `crypto.randomUUID()`.',
      'CSS selectors or anything parsing the format — treat it as opaque.',
    ],
    api: {
      signature: 'function useId(): string',
      returns:
        'An opaque id string. Since React 19.2 it looks like `_r_1_` (19.1 used `«r1»`, earlier versions `:r1:`).',
    },
    execution: [
      "Render: React computes the id from the component's tree position (and `identifierPrefix`, if set).",
      'The same id is returned on every render of that instance.',
      'Server and hydrating client produce identical ids as long as the trees match.',
    ],
    mistakes: [
      {
        title: 'Using useId for list keys',
        wrong: 'items.map((item) => <Row key={useId()} item={item} />)',
        why: 'Hooks cannot be called in loops, and the id is not tied to the data item.',
        right: 'items.map((item) => <Row key={item.id} item={item} />)',
      },
      {
        title: 'Hard-coded ids in reusable components',
        wrong: '<label htmlFor="password">Password</label>\n<input id="password" />',
        why: 'Two instances on one page share an id; labels point at the wrong input.',
        right: 'const id = useId();\n<label htmlFor={id}>Password</label>\n<input id={id} />',
      },
    ],
    edgeCases: [
      'Several React roots on one page: pass `identifierPrefix` to `createRoot`/`hydrateRoot` to keep ids unique.',
      'The 19.2 format (`_r_…_`) is valid in CSS selectors and `view-transition-name`; still, do not depend on it.',
    ],
    testing:
      'The test asserts every label targets its own input, `aria-describedby` includes the error only for the invalid field (accessible description), every id in the DOM is unique after adding fields, and the React 19.2 format is a valid selector.',
    production: ["The UI kit's `TextField` and `Panel` use the same pattern."],
  },
  {
    id: 'use-debug-value',
    title: 'useDebugValue — labels for custom hooks in DevTools',
    section: 'built-in',
    category: 'Refs & identity',
    level: 'advanced',
    summary:
      'Two custom hooks label themselves in React DevTools; the formatter defers the expensive formatting until inspection.',
    tags: ['useDebugValue', 'React DevTools', 'custom hooks', 'debugging', 'library authors'],
    demo: `${DIR}/UseDebugValueDemo.tsx`,
    sources: [`${DIR}/debugValueHooks.ts`, `${DIR}/UseDebugValueDemo.tsx`],
    tests: [`${DIR}/UseDebugValueDemo.test.tsx`],
    minReact: '18.0',
    support: {
      level: 'universal',
      notes:
        '`useDebugValue` exists since 16.8; these example hooks use `useSyncExternalStore` (18.0).',
    },
    officialDocs: [
      { label: 'useDebugValue', url: 'https://react.dev/reference/react/useDebugValue' },
      {
        label: 'React Developer Tools',
        url: 'https://react.dev/learn/react-developer-tools',
      },
    ],
    related: ['use-sync-external-store-browser', 'use-sync-external-store'],
    concept:
      '`useDebugValue(value, format?)` attaches a label to the custom hook that calls it, shown next to that hook in the React DevTools Components panel. With `format`, DevTools calls the formatter only when the component is inspected.',
    problem:
      'Hooks built from other hooks show up in DevTools as a tree of anonymous state/effect entries; consumers of a shared hook cannot tell what it currently represents.',
    whenToUse: [
      'Custom hooks published in shared libraries or used across many teams.',
      'Hooks whose internal state is hard to read (stores, subscriptions, state machines).',
    ],
    whenNotToUse: [
      'Every custom hook in an app — the label adds noise without helping.',
      'Debugging output for users or logs — it only affects DevTools.',
    ],
    api: {
      signature: 'function useDebugValue<T>(value: T, format?: (value: T) => unknown): void',
      params: [
        { name: 'value', type: 'T', description: 'The value to display.' },
        {
          name: 'format',
          type: '(value: T) => unknown',
          description: 'Called lazily by DevTools when the component is inspected.',
          optional: true,
        },
      ],
    },
    execution: [
      'Render: the hook records `value` and `format`; nothing is formatted.',
      'DevTools inspects the component → calls `format(value)` and shows e.g. `OnlineStatusDebug: "Online"`.',
      'Without DevTools, the call is effectively free.',
    ],
    mistakes: [
      {
        title: 'Formatting eagerly',
        wrong: 'useDebugValue(new Date(timestamp).toLocaleTimeString());',
        why: 'Formats on every render even when DevTools is closed.',
        right: 'useDebugValue(timestamp, (t) => new Date(t).toLocaleTimeString());',
      },
      {
        title: 'Calling it in a component',
        wrong: 'function Badge() {\n  useDebugValue("badge");\n}',
        why: 'It labels custom hooks; in a component body it has no useful effect.',
      },
    ],
    edgeCases: [
      'The label belongs to the custom hook that calls `useDebugValue`, shown under the component that uses that hook.',
      'The demo table calls the same exported formatters to preview the labels, since DevTools output cannot be rendered on the page.',
    ],
    testing:
      "DevTools cannot be inspected from a unit test, so tests cover the formatters, the hooks' values (online/offline events, last interaction time with a fake clock), that the shared window listeners are added once and removed with the last subscriber, and the demo preview.",
    production: [
      'Keep formatters pure and cheap to call repeatedly; DevTools may call them on every inspection.',
    ],
  },
];
