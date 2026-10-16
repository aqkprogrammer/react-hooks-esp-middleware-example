import type { CatalogEntry } from '../types';

const USE_SYNC_EXTERNAL_STORE_DOCS = {
  label: 'useSyncExternalStore',
  url: 'https://react.dev/reference/react/useSyncExternalStore',
};

const BROADCAST_DOCS = {
  label: 'MDN: Broadcast Channel API',
  url: 'https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API',
};

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
  {
    id: 'use-session-storage',
    title: 'useSessionStorage',
    section: 'custom',
    category: 'Storage & persistence',
    level: 'beginner',
    summary:
      '`useState` persisted to sessionStorage: survives reloads of one tab, gone when it closes.',
    tags: ['persistence', 'sessionStorage', 'per-tab', 'wizard', 'draft', 'ssr'],
    demo: 'examples/custom-hooks/storage/UseSessionStorageDemo.tsx',
    sources: ['hooks/storage/useSessionStorage.ts', 'hooks/storage/storageState.ts'],
    tests: [
      'hooks/storage/useSessionStorage.test.tsx',
      'hooks/storage/persistence.ssr.test.tsx',
      'examples/custom-hooks/storage/StorageDemos.test.tsx',
    ],
    minReact: '18.0',
    support: {
      level: 'client-only',
      notes: 'Renders `initialValue` on the server; in-memory fallback when storage is blocked.',
    },
    officialDocs: [
      {
        label: 'MDN: sessionStorage',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage',
      },
      USE_SYNC_EXTERNAL_STORE_DOCS,
    ],
    related: ['use-local-storage', 'use-persistent-state', 'use-cross-tab-state'],
    concept:
      'The same engine as `useLocalStorage` (`useStorageState`), bound to `sessionStorage`. Each tab has its own copy; it survives reloads and is discarded when the tab closes.',
    problem:
      'Multi-step forms and per-tab drafts should survive an accidental reload without leaking into other tabs or living forever on disk.',
    whenToUse: [
      'Wizard progress, unsent drafts, scroll or filter state that belongs to one tab.',
      'State that must not be shared when the user opens a second tab.',
    ],
    whenNotToUse: [
      'Preferences that should persist across sessions or tabs — use `useLocalStorage`.',
      'Live state shared between open tabs — use `useCrossTabState`.',
      'Secrets or tokens: any script on the origin can read sessionStorage while the tab lives.',
    ],
    api: {
      signature:
        'function useSessionStorage<T>(key: string, initialValue: T | (() => T), options?: StorageStateOptions<T>): readonly [value: T, setValue: SetStorageValue<T>, remove: () => void]',
      params: [
        { name: 'key', type: 'string', description: 'sessionStorage key.' },
        {
          name: 'initialValue',
          type: 'T | (() => T)',
          description: 'Used when nothing valid is stored, and on the server.',
        },
        {
          name: 'options',
          type: 'StorageStateOptions<T>',
          description:
            'Same as `useLocalStorage`: `serialize`, `deserialize`, `validate`, `onError` (`syncAcrossTabs` has no effect — the `storage` event never fires for another tab’s sessionStorage).',
          optional: true,
        },
      ],
      returns: 'A tuple: value, setter (value or updater) and `remove()`.',
    },
    execution: [
      'Render: `useSyncExternalStore` reads the raw string (server snapshot `null` → `initialValue`).',
      'Writes are synchronous and notify every hook in the tab bound to the same key.',
      'Unmount: listeners are removed.',
    ],
    edgeCases: [
      '“Duplicate tab” copies sessionStorage once; afterwards the tabs diverge.',
      'Quota errors keep the previous value and report `onError({ kind: "write" })`.',
      'A key in sessionStorage and the same key in localStorage never collide.',
    ],
    testing:
      'Unit tests cover functional updates, isolation from localStorage, quota errors and removal; an SSR test renders it in Node.',
    production: [
      'Clear wizard state explicitly on completion (`remove()`), not only on tab close.',
    ],
  },
  {
    id: 'use-cookie',
    title: 'useCookie',
    section: 'custom',
    category: 'Storage & persistence',
    level: 'intermediate',
    summary: 'Read, write and remove a non-HttpOnly cookie with explicit attributes, SSR-safe.',
    tags: ['cookie', 'document.cookie', 'SameSite', 'Secure', 'HttpOnly', 'consent', 'ssr'],
    demo: 'examples/custom-hooks/storage/UseCookieDemo.tsx',
    sources: ['hooks/storage/useCookie.ts'],
    tests: [
      'hooks/storage/useCookie.test.tsx',
      'hooks/storage/persistence.ssr.test.tsx',
      'examples/custom-hooks/storage/StorageDemos.test.tsx',
    ],
    minReact: '18.0',
    support: {
      level: 'client-only',
      notes:
        'Renders `serverValue` on the server. Uses the Cookie Store API `change` event where available; otherwise re-reads when the tab becomes visible.',
    },
    officialDocs: [
      {
        label: 'MDN: Document.cookie',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Document/cookie',
      },
      {
        label: 'MDN: Using HTTP cookies',
        url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies',
      },
      USE_SYNC_EXTERNAL_STORE_DOCS,
    ],
    related: ['use-local-storage', 'use-session-storage'],
    concept:
      'A `useSyncExternalStore` subscription to one cookie name. Writes go through `document.cookie` with encoded name/value and explicit `Path`, `Max-Age`/`Expires`, `SameSite` and `Secure` attributes, then notify every hook using that cookie.',
    problem:
      '`document.cookie` is a stringly-typed API: values must be encoded, attributes are easy to forget, removal must repeat the same path/domain, and browsers silently drop invalid writes.',
    whenToUse: [
      'Small, non-sensitive values the server also needs on the first request: locale, theme, consent.',
      'Values that must be readable during SSR (pass the request value as `serverValue`).',
    ],
    whenNotToUse: [
      'Session or auth cookies — they must be `HttpOnly` (invisible to JavaScript) and set by the server.',
      'Larger client-only data — every cookie is sent with every request; use Web Storage.',
    ],
    api: {
      signature:
        'function useCookie(name: string, options?: UseCookieOptions): readonly [value: string | null, setCookie: (value: string, options?: CookieOptions) => boolean, removeCookie: (options?: { path?: string; domain?: string }) => void]',
      params: [
        {
          name: 'name',
          type: 'string',
          description: 'Cookie name (encoded with `encodeURIComponent`).',
        },
        {
          name: 'options.path / domain / maxAge / expires / sameSite / secure',
          type: 'CookieOptions',
          description:
            'Defaults for every write: `path: "/"`, `sameSite: "lax"`, `secure` on https pages. `sameSite: "none"` always adds `Secure`.',
          optional: true,
        },
        {
          name: 'options.serverValue',
          type: 'string | null',
          description: 'Rendered on the server and during hydration. Default `null`.',
          optional: true,
        },
        {
          name: 'options.onError',
          type: '(error: CookieError) => void',
          description:
            '`unavailable` (cookies disabled) or `write` (the browser rejected the cookie).',
          optional: true,
        },
      ],
      returns:
        'A tuple: the decoded value (`null` when absent), `setCookie` (returns `false` when the write did not stick) and `removeCookie`.',
    },
    execution: [
      'Render: the snapshot is the decoded cookie string for `name` (a primitive, so no re-render loops).',
      'Commit: subscribes to a same-tab custom event, `cookieStore` `change` (if supported) and `visibilitychange`.',
      '`setCookie` writes, notifies, then reads back to detect silent rejection.',
      'Unmount: all listeners are removed.',
    ],
    mistakes: [
      {
        title: 'Writing unencoded values',
        wrong: 'document.cookie = `note=${userInput}`;',
        why: 'A `;` in the value ends the cookie and lets the input inject attributes such as `Domain` or `Max-Age`.',
        right: "setCookie(userInput); // encodeURIComponent'd by serializeCookie",
      },
      {
        title: 'Storing a session token in a JS-readable cookie',
        wrong: "setCookie('session', token);",
        why: 'Any XSS payload can read and exfiltrate it. Auth cookies must be `HttpOnly; Secure; SameSite`, set by the server.',
      },
      {
        title: 'Removing with a different path',
        wrong: "document.cookie = 'pref=; Max-Age=0'; // set earlier with Path=/settings",
        why: 'Removal only matches a cookie with the same name, path and domain; this one silently survives.',
      },
    ],
    edgeCases: [
      'Malformed percent-encoding in a cookie set by other code is returned raw instead of throwing.',
      'Values over ~4 KB, `Secure` on http and foreign domains are rejected by the browser → `onError({ kind: "write" })`.',
      'Cookies set for another path or domain are not verified (they are not visible from this page).',
    ],
    testing:
      'Unit tests cover encoding/injection, attribute serialisation, sync between components, re-reading on visibility, rejected writes (emulated 4 KB limit), disabled cookies and listener cleanup; an SSR test checks `serverValue`.',
    production: [
      'Keep cookies few and small: they are sent with every request to the domain.',
      'Prefer `SameSite=Lax` or `Strict`; `None` requires `Secure` and enables cross-site sending.',
    ],
  },
  {
    id: 'use-persistent-state',
    title: 'usePersistentState',
    section: 'custom',
    category: 'Storage & persistence',
    level: 'advanced',
    summary: 'Persistent state with a pluggable storage adapter and versioned schema migrations.',
    tags: ['persistence', 'adapter', 'schema version', 'migration', 'localStorage', 'ssr'],
    demo: 'examples/custom-hooks/storage/UsePersistentStateDemo.tsx',
    sources: ['hooks/storage/usePersistentState.ts', 'hooks/storage/storageState.ts'],
    tests: [
      'hooks/storage/usePersistentState.test.tsx',
      'hooks/storage/persistence.ssr.test.tsx',
      'examples/custom-hooks/storage/StorageDemos.test.tsx',
    ],
    minReact: '18.0',
    support: { level: 'client-only', notes: 'Renders `initialValue` on the server.' },
    officialDocs: [STORAGE_DOCS, USE_SYNC_EXTERNAL_STORE_DOCS],
    related: ['use-local-storage', 'use-session-storage'],
    concept:
      'Stores `{"__v": version, "value": …}` through any synchronous `PersistenceAdapter`. On read, older data runs through `migrate(oldValue, oldVersion)` and is written back once; data from a newer version is ignored and reported.',
    problem:
      'Persisted shapes evolve. Without versioning, a release that renames a field reads old data as garbage (or crashes), and a rollback misreads data written by the newer release.',
    whenToUse: [
      'Persisted settings or drafts whose shape will change across releases.',
      'Storage that is not Web Storage: an in-memory map (tests, SSR), a namespaced or encrypted wrapper, a native bridge.',
    ],
    whenNotToUse: [
      'Simple preferences that will never change shape — `useLocalStorage` is simpler.',
      'Async backends (IndexedDB, remote APIs) — adapters are synchronous; use a data library.',
      'Secrets: storage is readable by any script on the origin, and “encryption” with a key shipped to the browser is obfuscation.',
    ],
    api: {
      signature:
        'function usePersistentState<T>(key: string, initialValue: T | (() => T), options: { adapter: PersistenceAdapter; version?: number; migrate?: (oldValue: unknown, oldVersion: number) => unknown; validate?: (value: unknown) => value is T; onError?: (error: PersistentStateError) => void }): readonly [value: T, setValue: SetStorageValue<T>, remove: () => void]',
      params: [
        {
          name: 'options.adapter',
          type: 'PersistenceAdapter',
          description:
            '`{ getItem, setItem, removeItem, subscribe? }`. Use `webStorageAdapter("local" | "session")` or `createMemoryAdapter()`; define custom ones at module level.',
        },
        {
          name: 'options.version',
          type: 'number',
          description: 'Current schema version. Default `1`.',
          optional: true,
        },
        {
          name: 'options.migrate',
          type: '(oldValue, oldVersion) => unknown',
          description:
            'Upgrades older data. Non-enveloped legacy data arrives as version `0`. Keep it stable.',
          optional: true,
        },
        {
          name: 'options.validate',
          type: '(value) => value is T',
          description: 'Applied after migration.',
          optional: true,
        },
        {
          name: 'options.onError',
          type: '(error) => void',
          description: '`version`, `migrate`, `invalid`, `serialize` and `write` errors.',
          optional: true,
        },
      ],
      returns: 'The same tuple as `useLocalStorage`.',
    },
    execution: [
      'Render: `useSyncExternalStore` reads the raw string from the adapter; it is decoded, migrated and validated in `useMemo`.',
      'Commit: decode errors are reported and a migrated value is written back (in an effect, never during render).',
      'Writes serialise the envelope, call `adapter.setItem` and notify hooks sharing the adapter and key.',
      'Cross-tab updates arrive only through `adapter.subscribe` (implemented by `webStorageAdapter`).',
    ],
    mistakes: [
      {
        title: 'Changing the shape without a version',
        wrong:
          "// v1 stored { theme }, v2 expects { theme, fontSize }\nconst [prefs] = useLocalStorage<Prefs>('prefs', defaults);\nprefs.fontSize.toFixed(); // TypeError for every returning user",
        why: 'Old data passes a naive cast and breaks at runtime.',
        right:
          "usePersistentState('prefs', defaults, {\n  adapter: webStorageAdapter('local'),\n  version: 2,\n  migrate: (old) => ({ ...(old as V1), fontSize: 14 }),\n  validate: isPrefs,\n});",
      },
      {
        title: 'Creating the adapter during render',
        wrong: "usePersistentState('k', 0, { adapter: createMemoryAdapter() });",
        why: 'A new adapter every render means a new, empty store and a re-subscription each time.',
      },
    ],
    edgeCases: [
      'Stored version newer than `version` → `initialValue`, `onError({ kind: "version" })`, and the data is left untouched until the next write.',
      'A throwing `migrate` → `onError({ kind: "migrate" })` and `initialValue`.',
      'Non-JSON legacy strings are passed to `migrate` as version-0 raw strings.',
    ],
    testing:
      'Unit tests cover the envelope, migration + write-back, legacy v0 data, newer versions, throwing migrations, invalid data, quota and serialisation errors, same-adapter sync and the localStorage adapter with `storage` events; an SSR test renders it in Node.',
    production: [
      'Write migrations as pure functions per version step and unit-test them with real old payloads.',
      'Never delete a migration while users may still have that version stored.',
    ],
    diagram: {
      title: 'Reading a persisted value',
      description: 'How a stored envelope becomes the rendered value.',
      mermaid: `flowchart TD
  A[adapter.getItem] --> B{stored?}
  B -- no --> I[initialValue]
  B -- yes --> C[parse envelope or legacy v0]
  C --> D{stored version}
  D -- newer --> E[onError version] --> I
  D -- older --> F[migrate] --> G{validate}
  D -- same --> G
  G -- ok --> H[value]
  G -- fails --> J[onError invalid] --> I
  F -. after commit .-> K[write back upgraded envelope]`,
    },
  },
  {
    id: 'use-broadcast-channel',
    title: 'useBroadcastChannel',
    section: 'custom',
    category: 'Storage & persistence',
    level: 'intermediate',
    summary: 'Typed messages between same-origin tabs, windows and workers via BroadcastChannel.',
    tags: ['BroadcastChannel', 'cross-tab', 'messaging', 'logout sync', 'structured clone'],
    demo: 'examples/custom-hooks/storage/UseBroadcastChannelDemo.tsx',
    sources: ['hooks/storage/useBroadcastChannel.ts'],
    tests: [
      'hooks/storage/useBroadcastChannel.test.tsx',
      'hooks/storage/persistence.ssr.test.tsx',
      'examples/custom-hooks/storage/StorageDemos.test.tsx',
    ],
    minReact: '18.0',
    support: {
      level: 'browser-limited',
      notes: 'Feature-detected (`isSupported`); `false` on the server.',
    },
    officialDocs: [BROADCAST_DOCS],
    related: ['use-cross-tab-state', 'use-event-listener', 'use-latest'],
    concept:
      'Opens a `BroadcastChannel` in an effect, delivers incoming messages to the latest `onMessage` (and `lastMessage`), and closes the channel on unmount or name change.',
    problem:
      'Tabs need to coordinate — log out everywhere, refresh after a change elsewhere — without a server round-trip or abusing the `storage` event.',
    whenToUse: [
      'Event-style notifications: logout, “cart changed”, “new version deployed, reload”.',
      'Coordinating workers or iframes on the same origin.',
    ],
    whenNotToUse: [
      'State that new tabs must see — messages are not persisted (use `useLocalStorage` or `useCrossTabState`).',
      'Cross-origin communication — use `window.postMessage` with origin checks.',
      'Secrets: any same-origin script can join the channel.',
    ],
    api: {
      signature:
        'function useBroadcastChannel<T>(name: string | null, options?: { onMessage?: (message: T, event: MessageEvent) => void; validate?: (data: unknown) => data is T; onError?: (error: Error) => void }): { isSupported: boolean; postMessage: (message: T) => boolean; lastMessage: T | undefined }',
      params: [
        { name: 'name', type: 'string | null', description: 'Channel name; `null` disconnects.' },
        {
          name: 'options.onMessage',
          type: '(message, event) => void',
          description: 'Latest handler is always called.',
          optional: true,
        },
        {
          name: 'options.validate',
          type: '(data) => data is T',
          description: 'Guards against messages from older app versions in other tabs.',
          optional: true,
        },
        {
          name: 'options.onError',
          type: '(error) => void',
          description: '`DataCloneError`, `messageerror` and failed validation.',
          optional: true,
        },
      ],
      returns:
        '`isSupported`, a stable `postMessage` (returns `false` when it could not send) and `lastMessage`.',
    },
    execution: [
      'Render: `isSupported` comes from `useSyncExternalStore` (server snapshot `false`), avoiding hydration mismatches.',
      'Effect: a channel is created and `message`/`messageerror` listeners attached.',
      'Cleanup: listeners removed and `channel.close()` called.',
    ],
    mistakes: [
      {
        title: 'Expecting your own messages',
        wrong: "channel.postMessage('ping'); // waiting for it in the same instance",
        why: 'A BroadcastChannel never delivers a message to the instance that sent it — only to other instances.',
      },
      {
        title: 'Forgetting to close',
        wrong:
          "useEffect(() => {\n  const channel = new BroadcastChannel('app');\n  channel.onmessage = handle;\n}, []);",
        why: 'Each mount leaks an open channel that keeps receiving messages after unmount.',
      },
    ],
    edgeCases: [
      'Unclonable messages (functions, DOM nodes) → `postMessage` returns `false` and `onError` fires.',
      'Other hook instances in the same tab do receive the message.',
    ],
    testing:
      'Tests use Node’s in-process BroadcastChannel to verify delivery between two hooks, the latest handler, validation, clone errors, closing on unmount and the unsupported path.',
    production: ['Version your message types; old tabs can stay open for days.'],
  },
  {
    id: 'use-cross-tab-state',
    title: 'useCrossTabState',
    section: 'custom',
    category: 'Storage & persistence',
    level: 'advanced',
    summary: '`useState` shared live between open tabs via BroadcastChannel — nothing persisted.',
    tags: [
      'cross-tab',
      'BroadcastChannel',
      'last-writer-wins',
      'ephemeral state',
      'structured clone',
    ],
    demo: 'examples/custom-hooks/storage/UseCrossTabStateDemo.tsx',
    sources: ['hooks/storage/useCrossTabState.ts', 'hooks/storage/useBroadcastChannel.ts'],
    tests: [
      'hooks/storage/useCrossTabState.test.tsx',
      'hooks/storage/persistence.ssr.test.tsx',
      'examples/custom-hooks/storage/StorageDemos.test.tsx',
    ],
    minReact: '18.0',
    support: {
      level: 'browser-limited',
      notes: 'Behaves like plain `useState` without BroadcastChannel and on the server.',
    },
    officialDocs: [BROADCAST_DOCS],
    related: ['use-broadcast-channel', 'use-local-storage', 'use-session-storage'],
    concept:
      'Local React state plus a tiny protocol over `useBroadcastChannel`: updates are broadcast as `set` with a timestamp; a newly opened tab sends `request` and adopts the newest `reply`. Conflicts resolve last-writer-wins.',
    problem:
      'Sometimes tabs must agree on a value that should **not** outlive the session or touch disk — and `useLocalStorage` would persist it, serialise it to a string and count it against the quota.',
    whenToUse: [
      'Ephemeral shared UI state: the current slide in a presenter view, a “follow along” selection, a temporary filter across two windows.',
      'Values that do not serialise to JSON well (`Map`, `Set`, `Date`, `Blob`) — they are structured-cloned.',
    ],
    whenNotToUse: [
      'State that must survive closing all tabs — use `useLocalStorage`.',
      'Per-tab state — use `useState` or `useSessionStorage`.',
      'Collaborative editing across devices — that needs a server (CRDTs, WebSocket).',
    ],
    api: {
      signature:
        'function useCrossTabState<T>(channelName: string, initialValue: T | (() => T), options?: { validate?: (value: unknown) => value is T; onError?: (error: Error) => void }): readonly [value: T, setValue: SetStorageValue<T>]',
      params: [
        {
          name: 'channelName',
          type: 'string',
          description: 'Tabs using the same name share the value.',
        },
        {
          name: 'initialValue',
          type: 'T | (() => T)',
          description: 'Used until a tab replies or an update arrives.',
        },
        {
          name: 'options.validate',
          type: '(value) => value is T',
          description: 'Guards incoming values.',
          optional: true,
        },
      ],
      returns: 'A `useState`-like tuple.',
    },
    execution: [
      'Mount: the channel opens and a `request` is posted; open tabs with a value reply.',
      '`setValue` stamps `{ at, tab }`, updates locally and broadcasts `set`.',
      'Incoming `set`/`reply` messages are applied only if their stamp is newer, so all tabs converge.',
      'Unmount: the channel closes.',
    ],
    edgeCases: [
      'Two tabs writing in the same millisecond: ties break by tab id, so both end up with the same value.',
      'Reloading the only open tab resets to `initialValue` — by design.',
      'Clock changes between writes can reorder them; acceptable for UI state, not for data integrity.',
    ],
    testing:
      'Tests connect several hooks through Node’s BroadcastChannel: broadcast updates, late-joiner sync, structured-cloned Maps/Dates, convergence and validation, plus the unsupported fallback.',
    production: [
      'Keep values small; every update is cloned to every tab.',
      'Never broadcast secrets: any same-origin script can listen.',
    ],
    diagram: {
      title: 'Late-joiner sync',
      description: 'How a new tab catches up without any persistence.',
      mermaid: `sequenceDiagram
  participant A as Tab A
  participant C as BroadcastChannel
  participant B as New tab B
  A->>C: set value=3 stamp t1
  B->>C: request
  C->>A: request
  A->>C: reply value=3 stamp t1
  C->>B: reply value=3 stamp t1
  B->>B: t1 newer than nothing, adopt 3`,
    },
  },
];
