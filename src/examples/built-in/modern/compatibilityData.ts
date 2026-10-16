/**
 * Minimum React version for every built-in Hook / API covered by the
 * playground, plus legacy APIs that changed in React 19.
 *
 * Sources: the React 19, 19.2 and 19.3 release posts and the React 19
 * upgrade guide on react.dev, cross-checked against the installed
 * react/react-dom 19.3.1 builds and @types/react 19.3 (see
 * compatibilityData.test.ts, which asserts every `exportName` below against
 * the real modules). Reusable by docs: import `compatibility` and
 * `compatibilityGroups`.
 */

export type CompatibilityGroupId =
  'core' | 'react-18' | 'react-19' | 'react-19.2' | 'react-19.3' | 'legacy';

export type CompatibilityStatus =
  /** Stable and recommended. */
  | 'stable'
  /** Only exists in development builds. */
  | 'dev-only'
  /** Only meaningful with a server renderer / React Server Components. */
  | 'server-only'
  /** Still works, but superseded; a replacement exists. */
  | 'superseded'
  /** Still exported but deprecated (warns in development). */
  | 'deprecated'
  /** No longer supported. */
  | 'removed';

export type ModuleName = 'react' | 'react-dom' | 'react-dom/client';

export interface CompatibilityRow {
  /** Display name, e.g. `useOptimistic` or `<Activity>`. */
  name: string;
  kind: 'hook' | 'component' | 'api' | 'feature';
  /** Where it is imported from (omitted for behaviours and server-only modules). */
  module?: ModuleName;
  /** Export to verify in the installed build. Present unless `status` is `removed`. */
  exportName?: string;
  /** First stable React version that has it (for `removed`: the version that removed it). */
  minVersion: string;
  group: CompatibilityGroupId;
  status: CompatibilityStatus;
  notes: string;
  /** Catalog entry id of the demo in this playground, if there is one. */
  demo?: string;
}

export interface CompatibilityGroup {
  id: CompatibilityGroupId;
  title: string;
  description: string;
}

export const compatibilityGroups: readonly CompatibilityGroup[] = [
  {
    id: 'core',
    title: 'Core (16.x)',
    description:
      'Hooks shipped in 16.8, plus the component APIs from the 16.x line that this playground uses.',
  },
  {
    id: 'react-18',
    title: 'React 18 additions',
    description: 'Concurrent rendering and external stores.',
  },
  {
    id: 'react-19',
    title: 'React 19 additions',
    description:
      'Actions, forms, `use`, optimistic UI and ref/context simplifications (19.0–19.1).',
  },
  {
    id: 'react-19.2',
    title: 'React 19.2 additions',
    description: 'Activity, effect events and tooling.',
  },
  {
    id: 'react-19.3',
    title: 'React 19.3 additions',
    description: 'View Transitions and Fragment refs became stable.',
  },
  {
    id: 'legacy',
    title: 'Legacy & historical',
    description: 'APIs that are no longer needed, were renamed, or were removed in React 19.',
  },
];

export const compatibility: readonly CompatibilityRow[] = [
  // ---- Core ---------------------------------------------------------------
  {
    name: 'useState',
    kind: 'hook',
    module: 'react',
    exportName: 'useState',
    minVersion: '16.8',
    group: 'core',
    status: 'stable',
    notes: 'Local component state.',
  },
  {
    name: 'useEffect',
    kind: 'hook',
    module: 'react',
    exportName: 'useEffect',
    minVersion: '16.8',
    group: 'core',
    status: 'stable',
    notes: 'Synchronise with external systems after commit.',
  },
  {
    name: 'useContext',
    kind: 'hook',
    module: 'react',
    exportName: 'useContext',
    minVersion: '16.8',
    group: 'core',
    status: 'stable',
    notes: 'Read context unconditionally; `use(Context)` (19) may be conditional.',
  },
  {
    name: 'useReducer',
    kind: 'hook',
    module: 'react',
    exportName: 'useReducer',
    minVersion: '16.8',
    group: 'core',
    status: 'stable',
    notes: 'State transitions in a reducer.',
  },
  {
    name: 'useRef',
    kind: 'hook',
    module: 'react',
    exportName: 'useRef',
    minVersion: '16.8',
    group: 'core',
    status: 'stable',
    notes: 'Mutable box; requires an argument in the React 19 types.',
  },
  {
    name: 'useMemo',
    kind: 'hook',
    module: 'react',
    exportName: 'useMemo',
    minVersion: '16.8',
    group: 'core',
    status: 'stable',
    notes: 'Cache a calculation between renders.',
    demo: 'use-memo',
  },
  {
    name: 'useCallback',
    kind: 'hook',
    module: 'react',
    exportName: 'useCallback',
    minVersion: '16.8',
    group: 'core',
    status: 'stable',
    notes: 'Cache a function identity between renders.',
    demo: 'use-callback',
  },
  {
    name: 'useLayoutEffect',
    kind: 'hook',
    module: 'react',
    exportName: 'useLayoutEffect',
    minVersion: '16.8',
    group: 'core',
    status: 'stable',
    notes: 'Runs before paint; does nothing on the server.',
  },
  {
    name: 'useImperativeHandle',
    kind: 'hook',
    module: 'react',
    exportName: 'useImperativeHandle',
    minVersion: '16.8',
    group: 'core',
    status: 'stable',
    notes: 'Customise the value a ref exposes.',
  },
  {
    name: 'useDebugValue',
    kind: 'hook',
    module: 'react',
    exportName: 'useDebugValue',
    minVersion: '16.8',
    group: 'core',
    status: 'stable',
    notes: 'Label custom hooks in React DevTools.',
  },
  {
    name: 'createContext',
    kind: 'api',
    module: 'react',
    exportName: 'createContext',
    minVersion: '16.3',
    group: 'core',
    status: 'stable',
    notes: 'Create a context object.',
  },
  {
    name: 'memo',
    kind: 'api',
    module: 'react',
    exportName: 'memo',
    minVersion: '16.6',
    group: 'core',
    status: 'stable',
    notes: 'Component API, not a Hook: skip re-rendering with equal props.',
    demo: 'memo',
  },
  {
    name: 'lazy',
    kind: 'api',
    module: 'react',
    exportName: 'lazy',
    minVersion: '16.6',
    group: 'core',
    status: 'stable',
    notes: 'Code-split a component; suspends while loading.',
  },
  {
    name: '<Suspense>',
    kind: 'component',
    module: 'react',
    exportName: 'Suspense',
    minVersion: '16.6',
    group: 'core',
    status: 'stable',
    notes: 'Code splitting since 16.6; streaming SSR in 18; data via `use` in 19.',
    demo: 'suspense-error-boundary',
  },
  {
    name: '<Profiler>',
    kind: 'component',
    module: 'react',
    exportName: 'Profiler',
    minVersion: '16.9',
    group: 'core',
    status: 'stable',
    notes: 'Programmatic render timing; disabled in production unless using the profiling build.',
    demo: 'profiler',
  },

  // ---- React 18 -----------------------------------------------------------
  {
    name: 'useId',
    kind: 'hook',
    module: 'react',
    exportName: 'useId',
    minVersion: '18.0',
    group: 'react-18',
    status: 'stable',
    notes: 'Stable ids that match between server and client.',
  },
  {
    name: 'useTransition',
    kind: 'hook',
    module: 'react',
    exportName: 'useTransition',
    minVersion: '18.0',
    group: 'react-18',
    status: 'stable',
    notes: 'Non-blocking updates with `isPending`; async callbacks since 19.0.',
    demo: 'use-transition',
  },
  {
    name: 'startTransition',
    kind: 'api',
    module: 'react',
    exportName: 'startTransition',
    minVersion: '18.0',
    group: 'react-18',
    status: 'stable',
    notes: 'Transition without a pending flag; usable outside components.',
  },
  {
    name: 'useDeferredValue',
    kind: 'hook',
    module: 'react',
    exportName: 'useDeferredValue',
    minVersion: '18.0',
    group: 'react-18',
    status: 'stable',
    notes: 'Let part of the UI lag behind; `initialValue` argument since 19.0.',
    demo: 'use-deferred-value',
  },
  {
    name: 'useSyncExternalStore',
    kind: 'hook',
    module: 'react',
    exportName: 'useSyncExternalStore',
    minVersion: '18.0',
    group: 'react-18',
    status: 'stable',
    notes: 'Subscribe to an external store without tearing.',
  },
  {
    name: 'useInsertionEffect',
    kind: 'hook',
    module: 'react',
    exportName: 'useInsertionEffect',
    minVersion: '18.0',
    group: 'react-18',
    status: 'stable',
    notes: 'For CSS-in-JS libraries: inject styles before layout effects.',
  },
  {
    name: 'createRoot / hydrateRoot',
    kind: 'api',
    module: 'react-dom/client',
    exportName: 'createRoot',
    minVersion: '18.0',
    group: 'react-18',
    status: 'stable',
    notes: 'Concurrent root; replaces ReactDOM.render.',
  },
  {
    name: 'Automatic batching',
    kind: 'feature',
    minVersion: '18.0',
    group: 'react-18',
    status: 'stable',
    notes: 'Updates in timeouts, promises and native handlers are batched too.',
  },

  // ---- React 19 -----------------------------------------------------------
  {
    name: 'use',
    kind: 'api',
    module: 'react',
    exportName: 'use',
    minVersion: '19.0',
    group: 'react-19',
    status: 'stable',
    notes: 'Read a promise (suspends) or context; may be called conditionally.',
    demo: 'use',
  },
  {
    name: 'useActionState',
    kind: 'hook',
    module: 'react',
    exportName: 'useActionState',
    minVersion: '19.0',
    group: 'react-19',
    status: 'stable',
    notes: 'State produced by an Action, with `isPending`.',
    demo: 'use-action-state',
  },
  {
    name: 'useOptimistic',
    kind: 'hook',
    module: 'react',
    exportName: 'useOptimistic',
    minVersion: '19.0',
    group: 'react-19',
    status: 'stable',
    notes: 'Temporary state shown while an Action runs.',
    demo: 'use-optimistic',
  },
  {
    name: 'useFormStatus',
    kind: 'hook',
    module: 'react-dom',
    exportName: 'useFormStatus',
    minVersion: '19.0',
    group: 'react-19',
    status: 'stable',
    notes: 'Pending status of the parent `<form>` (react-dom).',
    demo: 'use-form-status',
  },
  {
    name: '<form action={fn}> / formAction',
    kind: 'feature',
    module: 'react-dom',
    minVersion: '19.0',
    group: 'react-19',
    status: 'stable',
    notes: 'Functions as form actions; automatic form reset.',
    demo: 'form-actions',
  },
  {
    name: 'requestFormReset',
    kind: 'api',
    module: 'react-dom',
    exportName: 'requestFormReset',
    minVersion: '19.0',
    group: 'react-19',
    status: 'stable',
    notes: 'Reset a form manually from inside a transition.',
  },
  {
    name: 'Async transitions (Actions)',
    kind: 'feature',
    module: 'react',
    minVersion: '19.0',
    group: 'react-19',
    status: 'stable',
    notes: '`startTransition(async () => …)` keeps `isPending` until it settles.',
    demo: 'use-transition-actions',
  },
  {
    name: '`ref` as a prop',
    kind: 'feature',
    minVersion: '19.0',
    group: 'react-19',
    status: 'stable',
    notes: 'Function components receive `ref` directly — no forwardRef.',
  },
  {
    name: 'Ref callback cleanup',
    kind: 'feature',
    minVersion: '19.0',
    group: 'react-19',
    status: 'stable',
    notes: 'A ref callback may return a cleanup function.',
    demo: 'fragment-refs',
  },
  {
    name: '<Context> as a provider',
    kind: 'feature',
    module: 'react',
    minVersion: '19.0',
    group: 'react-19',
    status: 'stable',
    notes: 'Render `<Ctx value>` instead of `<Ctx.Provider value>`.',
    demo: 'use',
  },
  {
    name: 'Document metadata',
    kind: 'feature',
    module: 'react-dom',
    minVersion: '19.0',
    group: 'react-19',
    status: 'stable',
    notes: '`<title>`, `<meta>`, `<link>` rendered anywhere are hoisted to `<head>`.',
  },
  {
    name: 'preload / preinit / preconnect / prefetchDNS',
    kind: 'api',
    module: 'react-dom',
    exportName: 'preload',
    minVersion: '19.0',
    group: 'react-19',
    status: 'stable',
    notes: 'Resource hints from components.',
  },
  {
    name: 'cache',
    kind: 'api',
    module: 'react',
    exportName: 'cache',
    minVersion: '19.0',
    group: 'react-19',
    status: 'server-only',
    notes: 'Memoises per request in Server Components; on the client it does not cache.',
  },
  {
    name: 'captureOwnerStack',
    kind: 'api',
    module: 'react',
    exportName: 'captureOwnerStack',
    minVersion: '19.1',
    group: 'react-19',
    status: 'dev-only',
    notes: 'Owner stack for diagnostics; development builds only.',
  },

  // ---- React 19.2 ---------------------------------------------------------
  {
    name: '<Activity>',
    kind: 'component',
    module: 'react',
    exportName: 'Activity',
    minVersion: '19.2',
    group: 'react-19.2',
    status: 'stable',
    notes: 'Hide UI and clean up its Effects while keeping its state.',
    demo: 'activity',
  },
  {
    name: 'useEffectEvent',
    kind: 'hook',
    module: 'react',
    exportName: 'useEffectEvent',
    minVersion: '19.2',
    group: 'react-19.2',
    status: 'stable',
    notes: 'Non-reactive logic called from Effects.',
  },
  {
    name: 'cacheSignal',
    kind: 'api',
    module: 'react',
    exportName: 'cacheSignal',
    minVersion: '19.2',
    group: 'react-19.2',
    status: 'server-only',
    notes: 'AbortSignal for the lifetime of a `cache()` scope (Server Components).',
  },
  {
    name: 'Performance tracks',
    kind: 'feature',
    minVersion: '19.2',
    group: 'react-19.2',
    status: 'stable',
    notes: 'Scheduler and component tracks in the browser Performance panel.',
  },
  {
    name: 'Partial pre-rendering',
    kind: 'feature',
    minVersion: '19.2',
    group: 'react-19.2',
    status: 'server-only',
    notes: '`prerender` + `resume` in react-dom server APIs.',
  },

  // ---- React 19.3 ---------------------------------------------------------
  {
    name: '<ViewTransition>',
    kind: 'component',
    module: 'react',
    exportName: 'ViewTransition',
    minVersion: '19.3',
    group: 'react-19.3',
    status: 'stable',
    notes: 'Animate Transition updates with the View Transition API.',
    demo: 'view-transition',
  },
  {
    name: 'addTransitionType',
    kind: 'api',
    module: 'react',
    exportName: 'addTransitionType',
    minVersion: '19.3',
    group: 'react-19.3',
    status: 'stable',
    notes: 'Label the cause of a Transition to pick animations.',
    demo: 'view-transition',
  },
  {
    name: 'Fragment refs',
    kind: 'feature',
    module: 'react',
    exportName: 'Fragment',
    minVersion: '19.3',
    group: 'react-19.3',
    status: 'stable',
    notes: '`<Fragment ref>` yields a FragmentInstance (focus, events, observers).',
    demo: 'fragment-refs',
  },
  {
    name: 'browser()',
    kind: 'api',
    module: 'react-dom',
    exportName: 'browser',
    minVersion: '19.3',
    group: 'react-19.3',
    status: 'stable',
    notes:
      'Not demonstrated: `use(browser())` opts a subtree out of SSR, and this playground is client-only, so it would never suspend.',
  },
  {
    name: '<Context> in Server Components',
    kind: 'feature',
    minVersion: '19.3',
    group: 'react-19.3',
    status: 'server-only',
    notes: 'Not demonstrated: needs a React Server Components framework.',
  },

  // ---- Legacy & historical ------------------------------------------------
  {
    name: 'forwardRef',
    kind: 'api',
    module: 'react',
    exportName: 'forwardRef',
    minVersion: '19.0',
    group: 'legacy',
    status: 'superseded',
    notes:
      'No longer needed for function components since 19.0 (`ref` is a prop); still exported, deprecation announced for a future release.',
  },
  {
    name: '<Context.Provider>',
    kind: 'component',
    module: 'react',
    minVersion: '19.0',
    group: 'legacy',
    status: 'superseded',
    notes:
      'Still works; `<Context>` is the new provider and `.Provider` will be deprecated in a future release.',
  },
  {
    name: 'useFormState',
    kind: 'hook',
    module: 'react-dom',
    exportName: 'useFormState',
    minVersion: '19.0',
    group: 'legacy',
    status: 'deprecated',
    notes:
      'Canary-era name, renamed to `useActionState` (from `react`) in 19.0; react-dom still exports it and warns in development.',
  },
  {
    name: 'defaultProps on function components',
    kind: 'feature',
    minVersion: '19.0',
    group: 'legacy',
    status: 'removed',
    notes: 'Use default parameters. Class components still support defaultProps.',
  },
  {
    name: 'propTypes checks',
    kind: 'feature',
    minVersion: '19.0',
    group: 'legacy',
    status: 'removed',
    notes: 'Silently ignored; use TypeScript.',
  },
  {
    name: 'String refs',
    kind: 'feature',
    minVersion: '19.0',
    group: 'legacy',
    status: 'removed',
    notes: '`ref="input"` + `this.refs` → ref callbacks or createRef.',
  },
  {
    name: 'Legacy context (contextTypes / getChildContext)',
    kind: 'feature',
    minVersion: '19.0',
    group: 'legacy',
    status: 'removed',
    notes: 'Use createContext.',
  },
  {
    name: 'ReactDOM.render',
    kind: 'api',
    module: 'react-dom',
    exportName: 'render',
    minVersion: '19.0',
    group: 'legacy',
    status: 'removed',
    notes: 'Use createRoot from react-dom/client.',
  },
  {
    name: 'ReactDOM.hydrate',
    kind: 'api',
    module: 'react-dom',
    exportName: 'hydrate',
    minVersion: '19.0',
    group: 'legacy',
    status: 'removed',
    notes: 'Use hydrateRoot from react-dom/client.',
  },
  {
    name: 'unmountComponentAtNode',
    kind: 'api',
    module: 'react-dom',
    exportName: 'unmountComponentAtNode',
    minVersion: '19.0',
    group: 'legacy',
    status: 'removed',
    notes: 'Use root.unmount().',
  },
  {
    name: 'findDOMNode',
    kind: 'api',
    module: 'react-dom',
    exportName: 'findDOMNode',
    minVersion: '19.0',
    group: 'legacy',
    status: 'removed',
    notes: 'Use DOM refs.',
  },
  {
    name: 'element.ref',
    kind: 'feature',
    minVersion: '19.0',
    group: 'legacy',
    status: 'deprecated',
    notes: 'Read `element.props.ref` instead.',
  },
];
