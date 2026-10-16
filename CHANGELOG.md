# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [2.0.0] — 2026-10-16

The repository grows from a single esp-js example into the **React Hooks
Playground**, while keeping (and fixing) the original integration.

### Added

- Interactive playground: searchable catalog, live demos with Strict Mode
  toggle, source and test viewer, API reference, learning path, light/dark
  theme.
- Built-in hook pages for every hook in React 19.3, with version labels.
- A typed, tested custom hooks library (`src/hooks`).
- Redux-style dispatch middleware for React reducers (`src/middleware/reducer`).
- State-management examples (reducers + middleware, context, external stores,
  Redux Toolkit, Zustand, Jotai, TanStack Query, SWR, RxJS).
- Real-world scenarios combining several hooks.
- Generated Markdown reference in `docs/` from the typed catalog.
- Vitest + Testing Library + MSW test suite with SSR checks; Playwright + axe
  end-to-end tests; GitHub Actions CI; Dependabot.

### Changed

- **Toolchain:** Create React App 2 → Vite 8; TypeScript 3.3 → 6.0 (strict);
  React 16.8 → 19.3; esp-js 2.0.1-rc.5 → 8.1; RxJS 6 → 7; immer 3 → 11.
- **esp-js integration:** `applyESPMiddleware` (called during render) is
  replaced by `createEspMiddleware`, `registerEspBridge` and `useEspReducer`,
  which register models in effects with cleanup, observe event types
  explicitly (required by esp-js 8) and protect the router from reducer
  exceptions. See `docs/esp-js/esp-migration-notes.md`.
- The original workspace/tiles demo moved to `src/esp-demo/` (history kept via
  `git mv`); its middleware chain now uses the shared middleware contract.

### Removed

- `uuid` (replaced by `useId`), `axios` (replaced by `fetch`) and the
  reqres.in login call (the endpoint now requires an API key; the demo uses a
  mocked `/api/login`).

### Fixed

- Tiles no longer stop responding after re-renders or hot reloads (models were
  re-created on every render and never disposed).
- RxJS price streams are tracked per tile and disposed on unmount instead of
  in a shared module-level array.

## [1.0.0]

- Original example: wrapping esp-js in middleware to integrate with React
  hooks (React 16.8, Create React App).
