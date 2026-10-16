import type { CatalogEntry } from '../types';

export const entries: CatalogEntry[] = [
  {
    id: 'use-event-listener',
    title: 'useEventListener',
    section: 'custom',
    category: 'Browser & DOM',
    level: 'beginner',
    summary: 'Typed, SSR-safe DOM event subscription that always calls the latest handler.',
    tags: ['events', 'dom', 'window', 'document', 'cleanup', 'stale closure'],
    demo: 'examples/custom-hooks/browser/UseEventListenerDemo.tsx',
    sources: ['hooks/browser/useEventListener.ts', 'hooks/state/useLatest.ts'],
    tests: ['hooks/browser/useEventListener.test.tsx'],
    minReact: '16.8',
    support: {
      level: 'client-only',
      notes: 'No-op on the server; listeners attach after hydration.',
    },
    officialDocs: [
      {
        label: 'Connecting to an external system',
        url: 'https://react.dev/learn/synchronizing-with-effects',
      },
      {
        label: 'MDN: addEventListener',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener',
      },
    ],
    related: ['use-latest', 'use-media-query'],
    concept:
      'Adds an event listener in an effect and removes it in the cleanup. The handler is kept in a ref, so a new handler on every render does not re-subscribe.',
    problem:
      'Hand-written listener effects either re-subscribe on every render (when the handler is a dependency) or call a stale handler (when it is omitted). Forgetting cleanup leaks listeners.',
    whenToUse: [
      'Global events React does not expose as props: `resize`, `keydown` on window, `visibilitychange`, `online`.',
      'Events on non-element targets: `MediaQueryList`, `WebSocket`, `BroadcastChannel`.',
    ],
    whenNotToUse: [
      'Events on elements you render — use JSX props such as `onClick`, which React delegates efficiently.',
    ],
    api: {
      signature:
        'function useEventListener(type: string, handler: (event: Event) => void, target?: EventTarget | RefObject<EventTarget | null> | null, options?: { capture?: boolean; passive?: boolean; once?: boolean }): void',
      params: [
        {
          name: 'type',
          type: 'string',
          description: 'Event name; typed overloads infer the event object.',
        },
        {
          name: 'handler',
          type: '(event) => void',
          description: 'Called with the event. May change every render.',
        },
        {
          name: 'target',
          type: 'EventTarget | RefObject | null',
          description: '`undefined` = window, a ref, any EventTarget, or `null` to disable.',
          optional: true,
        },
        {
          name: 'options',
          type: '{ capture, passive, once }',
          description: 'Listener options.',
          optional: true,
        },
      ],
      returns: 'Nothing.',
    },
    execution: [
      'Render: the latest handler is captured by `useLatest`.',
      'Layout effect: the handler ref is updated.',
      'Effect: the target is resolved (refs are read here, after React attached them) and the listener added.',
      'Cleanup (unmount, or type/target/options change): the same listener function is removed.',
    ],
    mistakes: [
      {
        title: 'Missing cleanup',
        wrong: "useEffect(() => {\n  window.addEventListener('resize', onResize);\n}, []);",
        why: 'Every mount adds another listener (Strict Mode mounts twice in development), and unmounted components keep receiving events.',
        right:
          "useEffect(() => {\n  window.addEventListener('resize', onResize);\n  return () => window.removeEventListener('resize', onResize);\n}, [onResize]);",
      },
      {
        title: 'Removing a different function',
        wrong:
          "useEffect(() => {\n  window.addEventListener('scroll', () => track());\n  return () => window.removeEventListener('scroll', () => track());\n}, []);",
        why: 'Two different arrow functions — the original listener is never removed.',
      },
    ],
    edgeCases: [
      'Ref targets are read when the effect runs; if the element is swapped without a re-render, pass the element itself instead.',
      'Changing `capture` re-subscribes because removal must use the same capture flag.',
    ],
    testing:
      'Tests assert that every added listener is removed on unmount, that changing the handler does not re-subscribe, ref targets work and `null` disables the listener.',
    production: [
      'Use `{ passive: true }` for scroll/touch/pointer listeners you never `preventDefault()`.',
    ],
  },
  {
    id: 'use-media-query',
    title: 'useMediaQuery',
    section: 'custom',
    category: 'Browser & DOM',
    level: 'beginner',
    summary: 'Subscribe to a CSS media query with `useSyncExternalStore` — tear-free and SSR-safe.',
    tags: ['responsive', 'matchMedia', 'breakpoints', 'useSyncExternalStore', 'ssr'],
    demo: 'examples/custom-hooks/browser/UseMediaQueryDemo.tsx',
    sources: ['hooks/browser/useMediaQuery.ts'],
    tests: ['hooks/browser/useMediaQuery.test.tsx', 'hooks/storage/storage.ssr.test.tsx'],
    minReact: '18.0',
    support: {
      level: 'universal',
      notes:
        'Falls back to `defaultValue` without `matchMedia`; supports the legacy `addListener` API.',
    },
    officialDocs: [
      {
        label: 'useSyncExternalStore',
        url: 'https://react.dev/reference/react/useSyncExternalStore',
      },
      {
        label: 'MDN: matchMedia',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Window/matchMedia',
      },
    ],
    related: ['use-event-listener', 'use-local-storage'],
    concept: 'Returns whether a media query currently matches and re-renders when that changes.',
    problem:
      '`useState` + `useEffect` versions render the wrong value first (a visible flash) and can tear during concurrent rendering.',
    whenToUse: [
      'Rendering different component trees per breakpoint, or reacting to user preferences in JS.',
    ],
    whenNotToUse: [
      'Pure styling — CSS media queries work without JavaScript and before hydration.',
    ],
    api: {
      signature:
        'function useMediaQuery(query: string, options?: { defaultValue?: boolean }): boolean',
      params: [
        { name: 'query', type: 'string', description: 'A media query, e.g. `(min-width: 768px)`.' },
        {
          name: 'options.defaultValue',
          type: 'boolean',
          description: 'Used on the server and without `matchMedia`. Default `false`.',
          optional: true,
        },
      ],
      returns: '`true` when the query matches.',
    },
    edgeCases: [
      'On the server the default value renders; after hydration React re-renders with the real value.',
      'Changing `query` re-subscribes because `subscribe` is memoised on it.',
    ],
    testing: 'Tests use an installable `matchMedia` fake to flip matches and swap queries.',
  },
];
