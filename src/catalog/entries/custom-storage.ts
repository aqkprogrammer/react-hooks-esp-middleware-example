import type { CatalogEntry } from '../types';

const STORAGE_DOCS = {
  label: 'MDN: Web Storage API',
  url: 'https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API',
};

export const entries: CatalogEntry[] = [
  {
    id: 'use-local-storage',
    title: 'useLocalStorage',
    section: 'custom',
    category: 'Storage & persistence',
    level: 'intermediate',
    summary: '`useState` persisted to localStorage, synced across components and tabs.',
    tags: ['persistence', 'localStorage', 'cross-tab', 'useSyncExternalStore', 'ssr'],
    demo: 'examples/custom-hooks/storage/UseLocalStorageDemo.tsx',
    sources: ['hooks/storage/useLocalStorage.ts', 'hooks/storage/storageState.ts'],
    tests: [
      'hooks/storage/useLocalStorage.test.tsx',
      'hooks/storage/storage.ssr.test.tsx',
      'examples/custom-hooks/storage/UseLocalStorageDemo.test.tsx',
    ],
    minReact: '18.0',
    support: {
      level: 'client-only',
      notes:
        'Renders `initialValue` on the server. Falls back to in-memory storage when Web Storage is blocked.',
    },
    officialDocs: [
      STORAGE_DOCS,
      {
        label: 'useSyncExternalStore',
        url: 'https://react.dev/reference/react/useSyncExternalStore',
      },
    ],
    related: ['use-media-query', 'use-event-listener'],
    concept:
      'Reads and writes a JSON-serialised value under a key in `localStorage` and re-renders every subscriber when it changes — in this tab (custom event) or another tab (`storage` event).',
    problem:
      'Persisting UI preferences with `useState` + `useEffect` usually causes a flash of the default value, desynchronised components, crashes on corrupt JSON and exceptions when storage is disabled.',
    whenToUse: [
      'Non-sensitive preferences: theme, collapsed panels, last-used filters, drafts.',
      'State that should survive reloads and be shared between tabs.',
    ],
    whenNotToUse: [
      'Secrets, access tokens or personal data — any script on the origin can read localStorage.',
      'Large or relational data — use IndexedDB.',
      'Server state — use a data-fetching cache such as TanStack Query.',
    ],
    api: {
      signature:
        'function useLocalStorage<T>(key: string, initialValue: T | (() => T), options?: StorageStateOptions<T>): readonly [value: T, setValue: SetStorageValue<T>, remove: () => void]',
      params: [
        {
          name: 'key',
          type: 'string',
          description: 'Storage key. Changing it switches subscriptions.',
        },
        {
          name: 'initialValue',
          type: 'T | (() => T)',
          description:
            'Used when nothing valid is stored, and on the server. Captured once on mount.',
        },
        {
          name: 'options.serialize / deserialize',
          type: '(value: T) => string / (raw: string) => unknown',
          description: 'Custom codecs. Default JSON. Keep them stable (module-level).',
          optional: true,
        },
        {
          name: 'options.validate',
          type: '(value: unknown) => value is T',
          description: 'Type guard for stored data; failures fall back to `initialValue`.',
          optional: true,
        },
        {
          name: 'options.syncAcrossTabs',
          type: 'boolean',
          description: 'Default `true`.',
          optional: true,
        },
        {
          name: 'options.onError',
          type: '(error: StorageError) => void',
          description:
            'Receives `unavailable`, `parse`, `invalid`, `serialize` and `write` (quota) errors.',
          optional: true,
        },
      ],
      returns:
        'A tuple: the current value, a setter accepting a value or updater function, and `remove()` which deletes the key.',
    },
    execution: [
      'Render: `useSyncExternalStore` reads the raw string for the key (server snapshot: `null`).',
      'The raw string is parsed and validated in `useMemo`; invalid data yields `initialValue`.',
      'Commit: the subscription listens for the same-tab custom event and the cross-tab `storage` event.',
      '`setValue` resolves updaters against the *stored* value, writes synchronously, then notifies same-tab subscribers.',
      'Unmount: both listeners are removed.',
    ],
    mistakes: [
      {
        title: 'Reading storage in a useState initialiser during SSR',
        wrong:
          "const [theme, setTheme] = useState(() => localStorage.getItem('theme') ?? 'light');",
        why: 'Throws on the server (`localStorage` is undefined) and causes a hydration mismatch when the stored value differs from the server HTML.',
        right: "const [theme, setTheme] = useLocalStorage('theme', 'light');",
      },
      {
        title: 'Writing in an effect on every change',
        wrong:
          "useEffect(() => {\n  localStorage.setItem('theme', JSON.stringify(theme));\n}, [theme]);",
        why: 'Other components and tabs never find out, and a quota error throws inside an effect.',
      },
    ],
    edgeCases: [
      'Corrupt JSON or data from an older app version → `initialValue` + `onError({ kind: "parse" | "invalid" })`.',
      'Quota exceeded → the previous value is kept and `onError({ kind: "write" })` fires.',
      'Storage disabled → an in-memory fallback keeps the UI working for the session.',
      '`storage.clear()` in another tab (event `key === null`) resets subscribers.',
    ],
    testing:
      'Unit tests cover functional updates, same-tab and cross-tab sync, corrupt and invalid data, quota errors, removal and unavailable storage; an SSR test renders it with `react-dom/server` in Node.',
    production: [
      'Namespace keys (e.g. `app:feature:key`) and version your schema; validate on read.',
      'Do not store anything sensitive: localStorage is readable by any script on the origin.',
    ],
  },
];
