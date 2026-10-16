# Code & content conventions

This guide is the contract for every hook, demo, test and catalog entry in the
repository. Pull requests are reviewed against it.

## Layout

| Path                            | What lives there                                                                                                            | Depends on                   |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `src/hooks/<category>/`         | The custom hooks library. One hook per file, `useThing.ts`, colocated `useThing.test.ts(x)`.                                | React only                   |
| `src/hooks/<category>/index.ts` | Public exports of the category (alphabetical). Everything here is re-exported from `src/hooks/index.ts`.                    | —                            |
| `src/hooks/internal/`           | Private helpers (`isBrowser`, `toError`, `useIsomorphicLayoutEffect`). Not exported publicly.                               | —                            |
| `src/middleware/`               | Middleware primitives: `esp-js/` (the original integration) and `reducer/` (dispatch middleware for `useReducer`).          | React, esp-js                |
| `src/examples/`                 | Interactive demos, grouped as `built-in/`, `custom-hooks/<category>/`, `scenarios/`, `state-management/`, `anti-patterns/`. | hooks, UI kit, optional libs |
| `src/esp-demo/`                 | The original esp-js workspace/tiles demo, migrated to React 19 + esp-js 8.                                                  | middleware                   |
| `src/catalog/`                  | Typed metadata for every page (`types.ts`, `entries/*.ts`). Drives the playground, generated docs and integrity tests.      | —                            |
| `src/components/ui/`            | Shared, accessible UI kit for demos.                                                                                        | React                        |
| `src/mocks/`                    | MSW handlers for the mocked `/api`, shared by the browser and the tests.                                                    | msw                          |
| `src/test/`                     | Test setup, MSW server and opt-in browser API fakes.                                                                        | vitest                       |
| `src/app/`                      | The playground shell (routing, layout, pages).                                                                              | everything                   |

Library code (`src/hooks`, `src/middleware`) must never import from
`src/examples`, `src/app`, `src/components` or optional state libraries.

## Hooks

- TypeScript, `strict`, no `any` (use `unknown` + narrowing). Generic where it helps.
- Named exports only: `export function useThing(...)`. Export option/return types too.
- Add a TSDoc comment: what it does, the important behaviour, SSR/browser notes.
- **SSR-safe**: never touch `window`/`document`/`navigator` during render or at
  module scope. Use `isBrowser` from `hooks/internal/env` and do work in effects,
  or `useSyncExternalStore` with a `getServerSnapshot`.
- **Feature-detect** browser APIs and expose `isSupported` when an API may be missing.
- **Clean up** every listener, timer, observer, subscription, object URL and request.
- **No stale closures**: keep long-lived callbacks fresh with `useLatest` (or
  `useEffectEvent` inside effects).
- **Stable return values**: memoise returned callbacks/objects that consumers are
  likely to put in dependency arrays. Do not memoise everything by reflex.
- The React Compiler lint treats any object with a `ref` property as a ref:
  destructure hook results (`const { ref, isIntersecting } = useX()`)
  instead of reading `result.ref` / `result.isIntersecting` in render.
- Never write `ref.current` during render, never call `setState` during render
  except the documented "adjust state on prop change" pattern, avoid
  `setState` directly inside an effect body when it can be derived instead.
- Do not wrap a built-in hook just to rename it.
- When a mature library solves the problem better (TanStack Query, React Hook
  Form, …) say so in the catalog entry's `whenNotToUse`.

## Demos

- One file per demo, `PascalCaseDemo.tsx`, **default export** a component with no props.
- Use the UI kit (`src/components/ui`): `Button`, `Panel`, `TextField`,
  `ValueTable` + `show()`, `EventLog` + `useEventLog()`, `Callout`, `Badge`,
  `RenderCount`, `ScrollArea` (use it for any scrollable content so keyboard
  users can scroll it). Layout classes: `stack`, `row`, `grid`, `spread`, `card`,
  `list`, `kbd`, `muted`, `mono`, `small`, `demo-surface`, `progress`,
  `visually-hidden`. Colours come from CSS variables (`var(--accent)` etc.) —
  never hard-code colours, so light and dark themes both work.
- Every control must work. No fake buttons, no placeholder text.
- Accessible: real `<button>`/`<input>` elements, visible labels (or
  `aria-label`), keyboard operable, focus visible, no colour-only signals.
- Network demos call the mocked API with plain `fetch('/api/...')` — see
  `src/mocks/handlers.ts` for endpoints. Feature-specific endpoints go in a new
  file in `src/mocks/extra/` that exports `handlers`.
- Demos may import optional libraries (Redux Toolkit, Zustand, …); the
  playground loads every demo lazily so they never enter the main bundle.

## Tests

- Vitest + React Testing Library + `@testing-library/user-event`.
- Hooks: `renderHook`; demos/scenarios: `render` + queries by role/label/text.
  Test user-observable behaviour, not implementation details.
- Timers: `vi.useFakeTimers()` and `act(() => vi.advanceTimersByTime(ms))`.
  Fully faked timers make Testing Library's async helpers (`findBy*`,
  `waitFor`, user-event) wait forever on a faked `setTimeout`. Either drive
  the UI with `fireEvent`, fake only what you need
  (`vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] })`),
  or use `vi.useFakeTimers({ shouldAdvanceTime: true })` with user-event.
- Suspense: interactions that make a component suspend must happen inside an
  awaited `act(async () => …)`, otherwise the test stays on the fallback.
- Network: the MSW server is always on; override per test with
  `server.use(http.get('/api/x', () => HttpResponse.json(...)))` from `src/test/server.ts`.
- Browser APIs jsdom lacks (`matchMedia`, `IntersectionObserver`,
  `ResizeObserver`): install fakes from `src/test/browserMocks.ts`. Test the
  unsupported path too.
- WebSocket mocks: close server-side connections a few milliseconds after
  opening (not synchronously) to avoid an MSW listener leak warning.
- SSR: name the file `*.ssr.test.tsx` to run it in the Node project, and use
  `renderToString` from `react-dom/server`.
- Assert cleanup (listeners removed, timers cleared, requests aborted).

## Catalog entries

Add an entry to the relevant `src/catalog/entries/*.ts` file. Paths are
relative to `src/`. Required for custom hooks: `api.signature`, `tests`.
The integrity test (`src/catalog/catalog.test.ts`) checks ids, file paths,
related ids and that every exported hook is documented. Write accurately: do
not claim behaviour the code does not have.

## Intentionally broken code

Code demonstrating Rules-of-Hooks violations lives in
`src/examples/anti-patterns/broken/`. It is excluded from type-checking,
linting, tests and the bundle, and is only displayed as text.

## Commands

```bash
npm run dev          # playground at http://localhost:5173
npm test             # all unit/integration tests (jsdom + ssr projects)
npm run typecheck
npm run lint
npm run format
npm run docs:generate
npm run check        # everything CI runs
```
