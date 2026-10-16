/**
 * The rows of the state-management comparison. Kept as data so the table and
 * the "what do I need?" filter cannot drift apart.
 */
export type Need =
  | 'local-ui'
  | 'shared-client'
  | 'cross-cutting'
  | 'event-streams'
  | 'server-cache'
  | 'outside-react';

export const needLabels: Record<Need, string> = {
  'local-ui': 'State used by one component (or a small subtree)',
  'shared-client': 'Client state shared across distant components',
  'cross-cutting': 'Logging, validation, analytics or persistence around every update',
  'event-streams': 'Complex timing: debounce, cancel, combine event streams',
  'server-cache': 'Data that lives on a server (cache, refetch, optimistic updates)',
  'outside-react': 'State that non-React code must read or update',
};

export interface Approach {
  id: string;
  name: string;
  /** Where the state lives. */
  lives: string;
  /** What re-renders on a change. */
  updates: string;
  /** How side effects / cross-cutting concerns are handled. */
  effects: string;
  /** Extra runtime dependency. */
  dependency: string;
  bestFor: string;
  avoidWhen: string;
  fits: Need[];
}

export const approaches: Approach[] = [
  {
    id: 'hooks',
    name: 'useState / useReducer',
    lives: 'In the component',
    updates: 'The owning component and its children',
    effects: 'Event handlers and effects',
    dependency: 'None (React)',
    bestFor: 'Local UI state; useReducer once updates depend on other fields',
    avoidWhen: 'Many distant components need the same state (prop drilling)',
    fits: ['local-ui'],
  },
  {
    id: 'context-reducer',
    name: 'Context + useReducer',
    lives: 'In a provider component',
    updates: 'Every consumer of a context whose value changed (no selectors)',
    effects: 'Event handlers and effects; wrap dispatch for middleware',
    dependency: 'None (React)',
    bestFor: 'Low-frequency app-wide values (theme, auth, locale) and dependency injection',
    avoidWhen: 'Frequent updates to a large object read by many components',
    fits: ['shared-client'],
  },
  {
    id: 'reducer-middleware',
    name: 'Reducer + dispatch middleware',
    lives: 'A small store owned by a component or module',
    updates: 'Subscribers (useSyncExternalStore)',
    effects: 'Composable middleware: logger, validation, thunk, persistence, ...',
    dependency: 'None (this repository’s ~60 lines)',
    bestFor: 'Cross-cutting concerns around a reducer without adopting a library',
    avoidWhen:
      'You want DevTools time travel, a large ecosystem or team conventions: use Redux Toolkit',
    fits: ['cross-cutting', 'shared-client'],
  },
  {
    id: 'event-middleware',
    name: 'Event-router middleware (esp-js)',
    lives: 'Models registered with an event router',
    updates: 'React stores bridged to the router (here via reducer middleware)',
    effects: 'Events flow through router stages (preview → normal → committed → final)',
    dependency: 'esp-js',
    bestFor: 'Event-heavy domains with many cooperating models (e.g. trading tiles)',
    avoidWhen: 'CRUD screens and forms: the indirection costs more than it buys',
    fits: ['cross-cutting', 'event-streams', 'outside-react'],
  },
  {
    id: 'external-store',
    name: 'External store + useSyncExternalStore',
    lives: 'Any object outside React',
    updates: 'Components whose selected snapshot changed',
    effects: 'Wherever the store is written (timers, sockets, middleware)',
    dependency: 'None (React 18+)',
    bestFor: 'Bridging browser APIs, sockets or legacy stores; selector-level re-renders',
    avoidWhen: 'React state would do: you own subscriptions and snapshot stability',
    fits: ['outside-react', 'shared-client'],
  },
  {
    id: 'redux',
    name: 'Redux Toolkit + React Redux',
    lives: 'One store per app',
    updates: 'Components whose useSelector result changed',
    effects: 'Thunks, listener middleware, custom middleware, RTK Query',
    dependency: '@reduxjs/toolkit, react-redux',
    bestFor: 'Large apps and teams: explicit actions, DevTools, strong conventions',
    avoidWhen: 'Small apps, or mostly server data (use a server-state cache, or RTK Query)',
    fits: ['shared-client', 'cross-cutting', 'outside-react'],
  },
  {
    id: 'zustand',
    name: 'Zustand',
    lives: 'A store created by create / createStore',
    updates: 'Components whose selector result changed',
    effects: 'Actions in the store; middleware: persist, devtools, immer',
    dependency: 'zustand',
    bestFor: 'Shared client state with little boilerplate',
    avoidWhen: 'You need enforced action conventions across a large team',
    fits: ['shared-client', 'outside-react'],
  },
  {
    id: 'jotai',
    name: 'Jotai',
    lives: 'Atoms; values in a store (Provider or default)',
    updates: 'Components reading an atom that changed (dependency-tracked)',
    effects: 'Write atoms; async atoms integrate with Suspense',
    dependency: 'jotai',
    bestFor: 'Many small, interdependent pieces of state and derived values',
    avoidWhen: 'You want one inspectable action log of every change',
    fits: ['shared-client', 'local-ui'],
  },
  {
    id: 'rxjs',
    name: 'RxJS streams',
    lives: 'Subjects / observables',
    updates: 'Subscribers (bridge with useSyncExternalStore)',
    effects: 'Operators: debounceTime, switchMap, combineLatest, retry, ...',
    dependency: 'rxjs',
    bestFor: 'Time-based event processing, cancellation and stream composition',
    avoidWhen: 'Plain state: operators add a learning curve for little gain',
    fits: ['event-streams', 'outside-react'],
  },
  {
    id: 'server-state',
    name: 'TanStack Query / SWR',
    lives: 'A query cache keyed by request',
    updates: 'Components using a query whose data or status changed',
    effects: 'Fetching, dedupe, caching, revalidation, retries, mutations',
    dependency: '@tanstack/react-query or swr',
    bestFor: 'Server data: loading/error states, caching, optimistic updates',
    avoidWhen: 'Client-only UI state (open panels, form drafts)',
    fits: ['server-cache'],
  },
];
