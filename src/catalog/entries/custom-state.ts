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
];
