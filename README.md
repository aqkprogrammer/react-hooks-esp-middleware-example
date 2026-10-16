# React Hooks Playground — From Fundamentals to Advanced Production Patterns

[![CI](https://github.com/aqkprogrammer/react-hooks-esp-middleware-example/actions/workflows/ci.yml/badge.svg)](https://github.com/aqkprogrammer/react-hooks-esp-middleware-example/actions/workflows/ci.yml)
![React 19.3](https://img.shields.io/badge/React-19.3-61dafb)
![TypeScript 6.0 strict](https://img.shields.io/badge/TypeScript-6.0%20strict-3178c6)
![Node 22.12+](https://img.shields.io/badge/Node-22.12%2B-339933)

An interactive, searchable and tested reference for React hooks. It covers
every built-in hook in React 19.3, a typed library of custom hooks, complete
real-world scenarios, state-management and middleware patterns, and the
repository's original idea: **wrapping [esp-js](https://github.com/esp/esp-js)
in middleware so React hooks can take part in an event-routed workspace.**

Every topic shows the **exact source files** behind it (loaded as raw text, so
code samples cannot go stale), links the **tests that verify it**, and explains
when _not_ to use the pattern; nearly all of them also run a **live demo**.

> **Repository name.** The repository keeps its original name,
> `react-hooks-esp-middleware-example`, because the esp-js middleware example
> is still at its core. See [the original integration](#the-original-esp-js-middleware-integration).

## Table of contents

- [Project goals](#project-goals)
- [The original ESP-JS middleware integration](#the-original-esp-js-middleware-integration)
- [Features](#features)
- [Compatibility](#compatibility)
- [Installation & quick start](#installation--quick-start)
- [Development commands](#development-commands)
- [Interactive playground](#interactive-playground)
- [Catalog at a glance](#catalog-at-a-glance)
- [Built-in hooks index](#built-in-hooks-index)
- [Custom hooks catalog](#custom-hooks-catalog)
- [Real-world scenarios](#real-world-scenarios)
- [State management & middleware guide](#state-management--middleware-guide)
- [ESP-JS integration pages](#esp-js-integration-pages)
- [Rules of Hooks & anti-patterns](#rules-of-hooks--anti-patterns)
- [Testing guide pages](#testing-guide-pages)
- [Code examples](#code-examples)
- [Repository structure](#repository-structure)
- [Testing](#testing)
- [TypeScript guidance](#typescript-guidance)
- [Performance guidance](#performance-guidance)
- [SSR & browser compatibility](#ssr--browser-compatibility)
- [Accessibility](#accessibility)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [Roadmap](#roadmap)
- [License](#license)
- [Official React documentation](#official-react-documentation)

## Project goals

1. **Teach hooks accurately.** Version-correct examples for the React version
   the project actually runs (19.3), with minimum-version labels on every page.
2. **Show production-quality patterns.** Cleanup, race conditions,
   cancellation, SSR safety, accessibility, failure states and tests — not just
   counters.
3. **Stay honest.** Browser-support caveats, privacy notes, and pointers to
   mature libraries (TanStack Query, React Hook Form, Redux Toolkit…) when a
   hand-written hook is the wrong tool.
4. **Preserve the esp-js middleware idea** and show where it fits next to
   ordinary hooks, `useReducer`, Redux middleware and external stores.

## The original ESP-JS middleware integration

The repository started as _"my example of wrapping esp-js in middleware to
integrate with react hooks"_: a fake shell ("workspace") with login and themes,
hosting two independent tiles (a price tile streaming prices with RxJS, and an
accumulators tile). Each layer had its own `useReducer` store; a middleware
turned `ESP_PUBLISH_ACTION` / `ESP_BROADCAST_ACTION` into esp-js router calls,
and a bridge model fed router events back into the reducers.

That behaviour is preserved and now runs on **React 19 + esp-js 8**:

```text
component ─dispatch─▶ middleware chain ─▶ ESP middleware ─publish/broadcast─▶ esp-js Router
                                                                                 │ preview → normal → committed → final
reducer ◀── bridge dispatches { type: eventType, payload: event } ◀─────────────┘
```

- **Code:** [`src/middleware/esp-js/`](src/middleware/esp-js) —
  `createEspMiddleware`, `registerEspBridge`, `useEspReducer`,
  `EspRouterProvider`.
- **Original demo (migrated):** [`src/esp-demo/`](src/esp-demo) — workspace,
  price tile and accumulators tile, with history preserved through `git mv`.
- **Docs:** [architecture](docs/esp-js/esp-middleware-overview.md) ·
  [original workspace](docs/esp-js/esp-original-workspace.md) ·
  [stages & filtering](docs/esp-js/esp-stages-and-filtering.md) ·
  [error isolation](docs/esp-js/esp-error-isolation.md) ·
  [migration notes](docs/esp-js/esp-migration-notes.md).

What changed in the migration (details in the
[migration notes](docs/esp-js/esp-migration-notes.md)):

- Models were registered **during render** on every render and never disposed
  — the reason the original demo told you to refresh when tiles stopped
  responding. They are now registered in an effect with cleanup and survive
  Strict Mode.
- esp-js 8 **drops events a model does not observe**; stores now declare
  `observedEvents`.
- An exception inside an esp-js observer **halts the router permanently**; the
  bridge now guards dispatches and reports errors instead.
- The middleware chain uses a Redux-style contract with a synchronous
  `getState()`; the reqres.in login (which now requires an API key) became a
  mocked `/api/login`.

esp-js middleware is **not** a built-in React API: esp-js is an event router,
the middleware is a dispatch wrapper, and React only ever sees state updates.

## Features

- **Playground** — search by name, category or use case; filter by section,
  category and level; live demos with a Strict Mode toggle and reset; tabbed
  source/test viewer with copy-to-clipboard; API reference; learning path with
  progress saved locally; light/dark/system theme; keyboard shortcut `/` for
  search; responsive layout.
- **Custom hooks library** (`src/hooks`) — typed, SSR-safe, feature-detecting
  and fully cleaned up; each hook has unit tests and a demo.
- **Middleware** — Redux-style dispatch middleware for React reducers
  (logger, analytics, validation, thunk, error reporting, persistence, undo
  enhancer) plus the esp-js integration.
- **Generated docs** — every topic is rendered to Markdown in [`docs/`](docs)
  from the same typed catalog that drives the playground.
- **Tests** — Vitest + Testing Library + user-event + MSW (jsdom), SSR tests in
  Node, axe-core checks, and Playwright end-to-end tests with axe.

## Compatibility

| Requirement | Version                                                   |
| ----------- | --------------------------------------------------------- |
| React       | `^19.3.1` (minimum per topic is shown on each page)       |
| Node.js     | 22.12+ (see `.nvmrc`)                                     |
| TypeScript  | ~6.0, `strict` with `noUncheckedIndexedAccess`            |
| Browsers    | Evergreen browsers (`browserslist`: `>0.2%, not dead`)    |
| Build       | Vite 8 (replaced Create React App 2, which is deprecated) |

The [compatibility page](docs/compatibility.md) groups every topic by its
minimum React version and lists browser-dependent hooks. Features that need a
newer React version than an example's minimum are labelled on that page.

## Installation & quick start

```bash
git clone https://github.com/aqkprogrammer/react-hooks-esp-middleware-example.git
cd react-hooks-esp-middleware-example
npm ci
npm run dev
```

Open http://localhost:5173. Network demos use a mocked API served in the
browser by [Mock Service Worker](https://mswjs.io/) — nothing leaves the page.

## Development commands

| Command                 | What it does                                                                   |
| ----------------------- | ------------------------------------------------------------------------------ |
| `npm run dev`           | Start the playground with hot reload                                           |
| `npm run build`         | Type-check and build to `dist/`                                                |
| `npm run preview`       | Serve the production build                                                     |
| `npm test`              | Unit + integration tests (jsdom and SSR projects)                              |
| `npm run test:coverage` | Tests with V8 coverage for `src/hooks` and `src/middleware`                    |
| `npm run test:e2e`      | Build, serve and run Playwright + axe (`npx playwright install chromium` once) |
| `npm run typecheck`     | `tsc -b`                                                                       |
| `npm run lint`          | ESLint (react-hooks recommended-latest, jsx-a11y, typescript)                  |
| `npm run format`        | Prettier                                                                       |
| `npm run docs:generate` | Regenerate `docs/` and the tables in this README                               |
| `npm run check`         | Everything CI runs                                                             |

## Interactive playground

| Route                                | Page                                                                                  |
| ------------------------------------ | ------------------------------------------------------------------------------------- |
| `#/`                                 | Home                                                                                  |
| `#/browse?section=built-in`          | Built-in hooks (also `custom`, `scenario`, `state`, `esp`, `testing`, `anti-pattern`) |
| `#/browse?q=debounce&level=advanced` | Search + filters (shareable URLs)                                                     |
| `#/entry/<id>`                       | A topic: demo, source, tests, docs                                                    |
| `#/api`                              | API reference for every custom hook                                                   |
| `#/learn`                            | Learning path with progress                                                           |

Each topic page follows the same template: **concept → problem → live demo →
when (not) to use → API → implementation → execution flow → diagram → common
mistakes → edge cases → browser support → testing → production
considerations → related APIs**.

To publish the playground on GitHub Pages, enable Pages (Settings → Pages →
Source: GitHub Actions) and run the **Deploy playground to GitHub Pages**
workflow manually.

## Catalog at a glance

<!-- catalog:stats:start -->

| Section                                                          | Topics                        |
| ---------------------------------------------------------------- | ----------------------------- |
| [Built-in Hooks](docs/built-in-hooks/README.md)                  | 48                            |
| [Custom Hooks](docs/custom-hooks/README.md)                      | 92                            |
| [Real-World Scenarios](docs/scenarios/README.md)                 | 30                            |
| [State Management & Middleware](docs/state-management/README.md) | 12                            |
| [ESP-JS Integration](docs/esp-js/README.md)                      | 5                             |
| [Testing](docs/testing/README.md)                                | 6                             |
| [Rules & Anti-patterns](docs/anti-patterns/README.md)            | 13                            |
| **Total**                                                        | **206** (197 with live demos) |

<!-- catalog:stats:end -->

## Built-in hooks index

<!-- catalog:built-in:start -->

| Topic                                                                                                     | Category           | Level           | React | Summary                                                                                                                                                          |
| --------------------------------------------------------------------------------------------------------- | ------------------ | --------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [useState — fundamentals, batching & lazy init](docs/built-in-hooks/use-state-fundamentals.md)            | State & context    | 🟢 beginner     | 16.8  | Primitive and object state, functional updates under batching, and lazy initialisation.                                                                          |
| [useState — immutable updates for arrays & objects](docs/built-in-hooks/use-state-immutable-updates.md)   | State & context    | 🟢 beginner     | 16.8  | Add, toggle, remove, reorder and sort arrays and update nested objects without mutation — and see why mutation fails.                                            |
| [useState — derived vs duplicated state](docs/built-in-hooks/use-state-derived-state.md)                  | State & context    | 🟡 intermediate | 16.8  | A copied selection and a stored total drift out of sync; storing an id and deriving the rest fixes both.                                                         |
| [useState — state colocation](docs/built-in-hooks/use-state-colocation.md)                                | State & context    | 🟡 intermediate | 16.8  | Keep state in the lowest component that needs it; lifting it too high re-renders unrelated siblings.                                                             |
| [useReducer — typed actions, lazy init & undo](docs/built-in-hooks/use-reducer.md)                        | State & context    | 🟡 intermediate | 16.8  | A pure, testable reducer with a discriminated-union action type, an exhaustive `never` check and lazy initialisation.                                            |
| [useContext — shared values, multiple contexts & React 19 providers](docs/built-in-hooks/use-context.md)  | State & context    | 🟢 beginner     | 19.0  | Provide theme and user to a subtree, compose providers, override a value for a nested subtree, and read context with `use()`.                                    |
| [useContext — avoiding unnecessary re-renders](docs/built-in-hooks/use-context-performance.md)            | State & context    | 🔴 advanced     | 19.0  | Compare an inline object value with split state/dispatch contexts and a memoised value, measured with render counts.                                             |
| [useEffect — lifecycle & dependency arrays](docs/built-in-hooks/use-effect-fundamentals.md)               | Effects            | 🟢 beginner     | 16.8  | Watch mount, update and unmount in a log: no deps vs `[]` vs `[roomId]`, and which cleanup runs when.                                                            |
| [useEffect — event listeners, timers & browser APIs](docs/built-in-hooks/use-effect-subscriptions.md)     | Effects            | 🟢 beginner     | 16.8  | A window listener, a setInterval stopwatch and `document.title` sync — each with a cleanup that undoes it.                                                       |
| [useEffect — WebSocket connection](docs/built-in-hooks/use-effect-websocket.md)                           | Effects            | 🟡 intermediate | 16.8  | Open a socket per channel, close it in the cleanup, and send through a ref without reconnecting.                                                                 |
| [useEffect — stale closures](docs/built-in-hooks/use-effect-stale-closures.md)                            | Effects            | 🟡 intermediate | 16.8  | An interval created once keeps the first render's values; updater functions and honest dependencies fix it.                                                      |
| [useEffect — race conditions & AbortController](docs/built-in-hooks/use-effect-race-conditions.md)        | Effects            | 🟡 intermediate | 16.8  | With inverted latency, the buggy search shows a stale response; aborting in the cleanup guarantees only the latest query wins.                                   |
| [useEffect — Strict Mode double mount](docs/built-in-hooks/use-effect-strict-mode.md)                     | Effects            | 🟡 intermediate | 18.0  | In development, Strict Mode runs setup → cleanup → setup on mount to prove your cleanup works.                                                                   |
| [You might not need an effect](docs/built-in-hooks/you-might-not-need-an-effect.md)                       | Effects            | 🟡 intermediate | 16.8  | Derive values during render and put event logic in handlers — with render counts and a notification bug to show why.                                             |
| [useLayoutEffect — measure before paint](docs/built-in-hooks/use-layout-effect.md)                        | Effects            | 🔴 advanced     | 16.8  | A tooltip measures its height and flips above/below its trigger; with useEffect the wrong position can flash first.                                              |
| [useInsertionEffect — CSS-in-JS style injection](docs/built-in-hooks/use-insertion-effect.md)             | Effects            | 🔴 advanced     | 18.0  | A tiny CSS-in-JS hook hashes declarations into a class and injects a ref-counted `<style>` before layout effects run.                                            |
| [useEffectEvent — non-reactive logic in effects](docs/built-in-hooks/use-effect-event.md)                 | Effects            | 🔴 advanced     | 19.2  | A chat connection depends on `roomId` only, while its "connected" notification reads the latest theme through an Effect Event.                                   |
| [useRef — DOM access, previous values & timer ids](docs/built-in-hooks/use-ref-dom-and-values.md)         | Refs & identity    | 🟢 beginner     | 16.8  | Focus the first invalid field, remember the previous value, and keep an interval id without re-rendering.                                                        |
| [useRef vs useState — mutable values that do not re-render](docs/built-in-hooks/use-ref-vs-state.md)      | Refs & identity    | 🟢 beginner     | 16.8  | Two counters side by side: state re-renders on every click, a ref changes silently and is read from a handler.                                                   |
| [useRef — canvas drawing](docs/built-in-hooks/use-ref-canvas.md)                                          | Refs & identity    | 🟡 intermediate | 16.8  | Draw with pointer events through a canvas ref; the in-progress stroke lives in a ref, the stroke count in state.                                                 |
| [useRef — integrating imperative third-party widgets](docs/built-in-hooks/use-ref-imperative-widgets.md)  | Refs & identity    | 🟡 intermediate | 16.8  | Wrap a vanilla-JS widget: container ref, instance ref, create/destroy effect, sync effect and a latest-callback ref.                                             |
| [Refs in React 19 — ref as a prop & ref callback cleanup](docs/built-in-hooks/ref-as-prop-and-cleanup.md) | Refs & identity    | 🟡 intermediate | 19.0  | Pass `ref` to function components without forwardRef, and return a cleanup from ref callbacks to track nodes in a Map.                                           |
| [useImperativeHandle — a small imperative API](docs/built-in-hooks/use-imperative-handle.md)              | Refs & identity    | 🔴 advanced     | 19.0  | A custom input exposes only `focus`, `clear` and `shake` to its parent instead of its DOM node.                                                                  |
| [useSyncExternalStore — shared external store](docs/built-in-hooks/use-sync-external-store.md)            | External stores    | 🔴 advanced     | 18.0  | A module-level store shared by independent components, each subscribed to a slice, plus the mutable-snapshot pitfall.                                            |
| [useSyncExternalStore — browser state & SSR](docs/built-in-hooks/use-sync-external-store-browser.md)      | External stores    | 🟡 intermediate | 18.0  | Subscribe to `navigator.onLine` and `document.visibilityState` with server snapshots that make SSR and hydration safe.                                           |
| [useId — accessible ids for reusable components](docs/built-in-hooks/use-id.md)                           | Refs & identity    | 🟢 beginner     | 18.0  | Unique, SSR-stable ids that wire labels, hints and errors to inputs — in as many instances as you render.                                                        |
| [useDebugValue — labels for custom hooks in DevTools](docs/built-in-hooks/use-debug-value.md)             | Refs & identity    | 🔴 advanced     | 18.0  | Two custom hooks label themselves in React DevTools; the formatter defers the expensive formatting until inspection.                                             |
| [useMemo](docs/built-in-hooks/use-memo.md)                                                                | Performance        | 🟡 intermediate | 16.8  | Cache the result of an expensive calculation, or keep an object identity stable, between renders.                                                                |
| [useCallback](docs/built-in-hooks/use-callback.md)                                                        | Performance        | 🟡 intermediate | 16.8  | Keep a function’s identity stable between renders — useful only when that identity matters.                                                                      |
| [memo (component API)](docs/built-in-hooks/memo.md)                                                       | Performance        | 🟡 intermediate | 16.6  | Not a Hook: wraps a component so React can skip re-rendering it when its props are equal — with an optional custom comparison.                                   |
| [useTransition](docs/built-in-hooks/use-transition.md)                                                    | Performance        | 🔴 advanced     | 18.0  | Mark an update as non-urgent so slow rendering never blocks typing or clicking, with an isPending flag.                                                          |
| [useDeferredValue](docs/built-in-hooks/use-deferred-value.md)                                             | Performance        | 🔴 advanced     | 18.0  | Let a slow part of the UI lag behind a fast-changing value, and show it as stale meanwhile.                                                                      |
| [Debounce vs deferred rendering](docs/built-in-hooks/debounce-vs-deferred.md)                             | Performance        | 🟡 intermediate | 18.0  | Debouncing delays work until input pauses; deferred rendering starts work immediately at low priority and interrupts it.                                         |
| [Rendering large lists](docs/built-in-hooks/large-lists.md)                                               | Performance        | 🟡 intermediate | 16.8  | What 5,000 rows cost, what memo() does and does not fix, and why virtualization is the real answer.                                                              |
| [<Profiler>](docs/built-in-hooks/profiler.md)                                                             | Performance        | 🔴 advanced     | 16.9  | Measure how often and how long a React subtree renders, programmatically.                                                                                        |
| [Memoization pitfalls & dependency mistakes](docs/built-in-hooks/memoization-pitfalls.md)                 | Performance        | 🟡 intermediate | 16.8  | Object/array literals in deps and props silently break memoisation — and when memoisation was never needed.                                                      |
| [React Compiler and manual memoization](docs/built-in-hooks/react-compiler.md)                            | Performance        | 🔴 advanced     | 17.0  | React Compiler 1.0 memoises components automatically; useMemo/useCallback become escape hatches. This project lints with its rules but does not compile with it. |
| [use](docs/built-in-hooks/use.md)                                                                         | Modern React (19+) | 🔴 advanced     | 19.0  | Read a promise (suspending until it settles) or a context — and, unlike Hooks, call it conditionally.                                                            |
| [useActionState](docs/built-in-hooks/use-action-state.md)                                                 | Modern React (19+) | 🟡 intermediate | 19.0  | State produced by an Action (often a form submission), with the pending flag built in.                                                                           |
| [useOptimistic](docs/built-in-hooks/use-optimistic.md)                                                    | Modern React (19+) | 🔴 advanced     | 19.0  | Show the expected result of an Action immediately; React drops it automatically when the Action ends.                                                            |
| [useFormStatus](docs/built-in-hooks/use-form-status.md)                                                   | Modern React (19+) | 🟡 intermediate | 19.0  | react-dom Hook that reads the pending status of the parent <form> — perfect for reusable submit buttons.                                                         |
| [<form action={fn}> Actions](docs/built-in-hooks/form-actions.md)                                         | Modern React (19+) | 🟢 beginner     | 19.0  | Pass a function to a form’s action: React calls it with FormData in a transition and resets the form.                                                            |
| [Suspense + error boundaries for data](docs/built-in-hooks/suspense-error-boundary.md)                    | Modern React (19+) | 🔴 advanced     | 19.0  | Declare loading and error UI with boundaries; their placement decides reveal order and blast radius.                                                             |
| [Async transitions (Actions)](docs/built-in-hooks/use-transition-actions.md)                              | Modern React (19+) | 🟡 intermediate | 19.0  | React 19: startTransition accepts async functions and keeps isPending true until they settle.                                                                    |
| [<Activity>](docs/built-in-hooks/activity.md)                                                             | Modern React (19+) | 🔴 advanced     | 19.2  | React 19.2: hide part of the UI while keeping its state and DOM, with its Effects cleaned up.                                                                    |
| [<ViewTransition> & addTransitionType](docs/built-in-hooks/view-transition.md)                            | Modern React (19+) | 🔴 advanced     | 19.3  | React 19.3: animate updates made inside Transitions with the browser View Transition API.                                                                        |
| [Fragment refs](docs/built-in-hooks/fragment-refs.md)                                                     | Modern React (19+) | 🔴 advanced     | 19.3  | React 19.3: a ref on <Fragment> gives a FragmentInstance to focus, listen to and observe a group of siblings.                                                    |
| [React version compatibility](docs/built-in-hooks/react-version-compatibility.md)                         | Compatibility      | 🟢 beginner     | 16.8  | Every built-in Hook and API in this playground with the React version that introduced it — and what React 19 removed.                                            |

<!-- catalog:built-in:end -->

## Custom hooks catalog

Every hook is exported from [`src/hooks/index.ts`](src/hooks/index.ts) and
documented with purpose, signature, parameters, return value, example, edge
cases, browser support, related hooks and tests in
[`docs/custom-hooks/`](docs/custom-hooks/README.md).

<!-- catalog:custom:start -->

| Topic                                                                      | Category                    | Level           | React | Summary                                                                                                                                |
| -------------------------------------------------------------------------- | --------------------------- | --------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------- |
| [useLatest](docs/custom-hooks/use-latest.md)                               | State utilities             | 🟡 intermediate | 16.8  | A ref that always holds the latest committed value, for long-lived callbacks.                                                          |
| [usePrevious](docs/custom-hooks/use-previous.md)                           | State utilities             | 🟢 beginner     | 16.8  | The previous _distinct_ value of a prop or state, without touching refs during render.                                                 |
| [useBoolean](docs/custom-hooks/use-boolean.md)                             | State utilities             | 🟢 beginner     | 16.8  | Boolean state with stable `setTrue`, `setFalse` and `toggle` actions.                                                                  |
| [useToggle](docs/custom-hooks/use-toggle.md)                               | State utilities             | 🟢 beginner     | 16.8  | Cycle through a boolean or a fixed tuple of values (`light → dark → system`).                                                          |
| [useCounter](docs/custom-hooks/use-counter.md)                             | State utilities             | 🟢 beginner     | 16.8  | A number with `min`/`max` clamping, a `step`, `set` and `reset`.                                                                       |
| [useList](docs/custom-hooks/use-list.md)                                   | State utilities             | 🟡 intermediate | 16.8  | An array in state with immutable `push`, `insertAt`, `updateAt`, `removeAt`, `move`, `filter`, `clear`, `reset`.                       |
| [useSet](docs/custom-hooks/use-set.md)                                     | State utilities             | 🟡 intermediate | 16.8  | A `Set` in state with immutable `add`, `remove`, `toggle`, `clear`, `reset`.                                                           |
| [useMap](docs/custom-hooks/use-map.md)                                     | State utilities             | 🟡 intermediate | 16.8  | A `Map` in state with immutable `set`, `update`, `remove`, `clear`, `reset`.                                                           |
| [useQueue](docs/custom-hooks/use-queue.md)                                 | State utilities             | 🟡 intermediate | 18.0  | A FIFO queue whose `dequeue()` returns the removed item synchronously.                                                                 |
| [useUndoRedo](docs/custom-hooks/use-undo-redo.md)                          | State utilities             | 🔴 advanced     | 16.8  | Undo/redo history (past/present/future) with a pure reducer, a history limit and coalescing.                                           |
| [useStableCallback](docs/custom-hooks/use-stable-callback.md)              | State utilities             | 🔴 advanced     | 18.0  | A function with a permanent identity that always calls the latest callback.                                                            |
| [useControllableState](docs/custom-hooks/use-controllable-state.md)        | State utilities             | 🔴 advanced     | 16.8  | Support both controlled (`value` + `onChange`) and uncontrolled (`defaultValue`) usage in one component.                               |
| [useDebounce](docs/custom-hooks/use-debounce.md)                           | Timing & scheduling         | 🟢 beginner     | 16.8  | A value that only updates after it has stopped changing for `delayMs`.                                                                 |
| [useDebouncedCallback](docs/custom-hooks/use-debounced-callback.md)        | Timing & scheduling         | 🟡 intermediate | 16.8  | A stable debounced function with leading/trailing edges, `maxWait`, `cancel`, `flush` and `isPending`.                                 |
| [useThrottle / useThrottledCallback](docs/custom-hooks/use-throttle.md)    | Timing & scheduling         | 🟡 intermediate | 16.8  | Run a callback (or publish a value) at most once per interval while events keep coming.                                                |
| [useInterval](docs/custom-hooks/use-interval.md)                           | Timing & scheduling         | 🟢 beginner     | 16.8  | Declarative `setInterval`: latest callback, `null` pauses, delay changes restart.                                                      |
| [useTimeout](docs/custom-hooks/use-timeout.md)                             | Timing & scheduling         | 🟡 intermediate | 16.8  | Declarative `setTimeout` with reactive `isPending` and `start`/`reset`/`clear` controls.                                               |
| [useAnimationFrame](docs/custom-hooks/use-animation-frame.md)              | Timing & scheduling         | 🟡 intermediate | 16.8  | A `requestAnimationFrame` loop with frame delta time, pause and cleanup.                                                               |
| [useIdle](docs/custom-hooks/use-idle.md)                                   | Timing & scheduling         | 🟡 intermediate | 16.8  | Detect when the user has been inactive for a timeout (activity events + `visibilitychange`).                                           |
| [useLongPress](docs/custom-hooks/use-long-press.md)                        | Timing & scheduling         | 🟡 intermediate | 16.8  | Press-and-hold detection for pointer and keyboard, returned as props to spread.                                                        |
| [useDoubleClick](docs/custom-hooks/use-double-click.md)                    | Timing & scheduling         | 🟢 beginner     | 16.8  | Tell a single click from a double click on the same element.                                                                           |
| [useEventListener](docs/custom-hooks/use-event-listener.md)                | Browser & DOM               | 🟢 beginner     | 16.8  | Typed, SSR-safe DOM event subscription that always calls the latest handler.                                                           |
| [useMediaQuery](docs/custom-hooks/use-media-query.md)                      | Browser & DOM               | 🟢 beginner     | 18.0  | Subscribe to a CSS media query with `useSyncExternalStore` — tear-free and SSR-safe.                                                   |
| [useClickOutside](docs/custom-hooks/use-click-outside.md)                  | Browser & DOM               | 🟡 intermediate | 16.8  | Close popovers and menus when the user presses outside one or more elements.                                                           |
| [useHover](docs/custom-hooks/use-hover.md)                                 | Browser & DOM               | 🟢 beginner     | 16.8  | Know whether a pointer is over an element: `[ref, isHovered]` via pointer events.                                                      |
| [useFocus](docs/custom-hooks/use-focus.md)                                 | Browser & DOM               | 🟢 beginner     | 16.8  | Whether an element itself has focus: `[ref, isFocused]`, including autofocused elements.                                               |
| [useFocusWithin](docs/custom-hooks/use-focus-within.md)                    | Browser & DOM               | 🟡 intermediate | 16.8  | Focus state for a whole subtree, with enter/leave callbacks that use `relatedTarget` so moving inside does not count.                  |
| [useIntersectionObserver](docs/custom-hooks/use-intersection-observer.md)  | Browser & DOM               | 🟡 intermediate | 18.0  | Visibility of an element in the viewport or a scroll container, with thresholds, rootMargin and freeze-once-visible.                   |
| [useResizeObserver](docs/custom-hooks/use-resize-observer.md)              | Browser & DOM               | 🟡 intermediate | 18.0  | Run a callback whenever an element (not the window) changes size.                                                                      |
| [useElementSize](docs/custom-hooks/use-element-size.md)                    | Browser & DOM               | 🟢 beginner     | 18.0  | Width and height of an element as state, via ResizeObserver (content-box or border-box).                                               |
| [useMutationObserver](docs/custom-hooks/use-mutation-observer.md)          | Browser & DOM               | 🔴 advanced     | 18.0  | React to DOM changes made outside React (third-party widgets, contenteditable).                                                        |
| [useWindowSize](docs/custom-hooks/use-window-size.md)                      | Browser & DOM               | 🟢 beginner     | 18.0  | Viewport width and height via `useSyncExternalStore`, with an SSR default and optional throttling.                                     |
| [useScrollPosition](docs/custom-hooks/use-scroll-position.md)              | Browser & DOM               | 🟡 intermediate | 16.8  | Scroll offset of the window or an element, with a passive listener and one update per frame.                                           |
| [useScrollLock](docs/custom-hooks/use-scroll-lock.md)                      | Browser & DOM               | 🟡 intermediate | 16.8  | Lock page scrolling for modals with scrollbar-gap compensation, exact style restoration and nested-lock counting.                      |
| [useFullscreen](docs/custom-hooks/use-fullscreen.md)                       | Browser & DOM               | 🟡 intermediate | 18.0  | Enter, exit and toggle full screen for an element, with live state and error capture.                                                  |
| [useDocumentTitle](docs/custom-hooks/use-document-title.md)                | Browser & DOM               | 🟢 beginner     | 16.8  | Set `document.title` from a component, optionally restoring the previous title on unmount.                                             |
| [usePageVisibility](docs/custom-hooks/use-page-visibility.md)              | Browser & DOM               | 🟢 beginner     | 18.0  | `true` while the tab is visible — pause polling, video and animations in the background.                                               |
| [useOnlineStatus](docs/custom-hooks/use-online-status.md)                  | Browser & DOM               | 🟢 beginner     | 18.0  | `navigator.onLine` as tear-free state — remembering that "online" does not prove internet access.                                      |
| [useClipboard](docs/custom-hooks/use-clipboard.md)                         | Browser & DOM               | 🟡 intermediate | 18.0  | Copy text with "Copied!" feedback that resets itself, error state and secure-context detection; optional read.                         |
| [useGeolocation](docs/custom-hooks/use-geolocation.md)                     | Browser & DOM               | 🟡 intermediate | 18.0  | One-shot or continuous position on request, with loading/error states, permission-denied handling and watch cleanup.                   |
| [usePreferredColorScheme](docs/custom-hooks/use-preferred-color-scheme.md) | Browser & DOM               | 🟢 beginner     | 18.0  | The user's light/dark preference from `prefers-color-scheme`, built on `useMediaQuery`.                                                |
| [useReducedMotion](docs/custom-hooks/use-reduced-motion.md)                | Browser & DOM               | 🟢 beginner     | 18.0  | `true` when the user asked to minimise motion — switch off JS-driven animation and autoplay.                                           |
| [useNetworkInformation](docs/custom-hooks/use-network-information.md)      | Browser & DOM               | 🟡 intermediate | 18.0  | Connection hints (`effectiveType`, `downlink`, `rtt`, `saveData`) from `navigator.connection` — Chromium only.                         |
| [useLocalStorage](docs/custom-hooks/use-local-storage.md)                  | Storage & persistence       | 🟡 intermediate | 18.0  | `useState` persisted to localStorage, synced across components and tabs.                                                               |
| [useSessionStorage](docs/custom-hooks/use-session-storage.md)              | Storage & persistence       | 🟢 beginner     | 18.0  | `useState` persisted to sessionStorage: survives reloads of one tab, gone when it closes.                                              |
| [useCookie](docs/custom-hooks/use-cookie.md)                               | Storage & persistence       | 🟡 intermediate | 18.0  | Read, write and remove a non-HttpOnly cookie with explicit attributes, SSR-safe.                                                       |
| [usePersistentState](docs/custom-hooks/use-persistent-state.md)            | Storage & persistence       | 🔴 advanced     | 18.0  | Persistent state with a pluggable storage adapter and versioned schema migrations.                                                     |
| [useBroadcastChannel](docs/custom-hooks/use-broadcast-channel.md)          | Storage & persistence       | 🟡 intermediate | 18.0  | Typed messages between same-origin tabs, windows and workers via BroadcastChannel.                                                     |
| [useCrossTabState](docs/custom-hooks/use-cross-tab-state.md)               | Storage & persistence       | 🔴 advanced     | 18.0  | `useState` shared live between open tabs via BroadcastChannel — nothing persisted.                                                     |
| [useAsync](docs/custom-hooks/use-async.md)                                 | Data fetching & async       | 🟡 intermediate | 16.8  | Run a promise-returning function when deps change, with abort, stale-result protection and a typed status union.                       |
| [useAsyncFn](docs/custom-hooks/use-async-fn.md)                            | Data fetching & async       | 🟡 intermediate | 16.8  | Imperative async calls (submit, mutate) with latest-call-wins, cancel and a never-rejecting execute().                                 |
| [useFetch](docs/custom-hooks/use-fetch.md)                                 | Data fetching & async       | 🟡 intermediate | 16.8  | Declarative fetch with abort on change/unmount, timeouts, typed JSON and typed HTTP errors.                                            |
| [useRequest](docs/custom-hooks/use-request.md)                             | Data fetching & async       | 🔴 advanced     | 18.0  | A minimal stale-while-revalidate cache: shared by key, deduplicated, with optimistic mutate.                                           |
| [useResource](docs/custom-hooks/use-resource.md)                           | Data fetching & async       | 🔴 advanced     | 19.0  | Suspense data with React 19 `use()`: one cached promise per key. A teaching tool.                                                      |
| [usePagination](docs/custom-hooks/use-pagination.md)                       | Data fetching & async       | 🟢 beginner     | 16.8  | Page and page-size state with derived ranges and page buttons — pure, works with any data source.                                      |
| [useInfiniteScroll](docs/custom-hooks/use-infinite-scroll.md)              | Data fetching & async       | 🟡 intermediate | 18.0  | Load more when a sentinel scrolls into view — with guards that make duplicate loads impossible.                                        |
| [useRetry](docs/custom-hooks/use-retry.md)                                 | Data fetching & async       | 🟡 intermediate | 16.8  | Retry an async call with exponential backoff, jitter, a retry predicate and full cancellation.                                         |
| [usePolling](docs/custom-hooks/use-polling.md)                             | Data fetching & async       | 🟡 intermediate | 18.0  | Poll on an interval without overlapping requests, pausing while the tab is hidden.                                                     |
| [useWebSocket](docs/custom-hooks/use-web-socket.md)                        | Data fetching & async       | 🔴 advanced     | 18.0  | A WebSocket connection with status, bounded message history and backoff reconnects.                                                    |
| [useSSE](docs/custom-hooks/use-sse.md)                                     | Data fetching & async       | 🟡 intermediate | 18.0  | Subscribe to Server-Sent Events with EventSource: named events, history and clean shutdown.                                            |
| [useInput](docs/custom-hooks/use-input.md)                                 | Forms & input               | 🟢 beginner     | 16.8  | One controlled text value with `bind` props, an input transform and `reset()`.                                                         |
| [useField](docs/custom-hooks/use-field.md)                                 | Forms & input               | 🟡 intermediate | 18.0  | A validated field: value, touched, dirty, error, async checks and accessible `aria-invalid` / `aria-describedby` props.                |
| [useFormValidation](docs/custom-hooks/use-form-validation.md)              | Forms & input               | 🔴 advanced     | 16.8  | Headless sync + async validation per field with cancellation of stale async checks.                                                    |
| [useFormDirtyState](docs/custom-hooks/use-form-dirty-state.md)             | Forms & input               | 🟡 intermediate | 16.8  | Which fields differ from their saved values, plus an optional "unsaved changes" unload warning.                                        |
| [useFormSubmission](docs/custom-hooks/use-form-submission.md)              | Forms & input               | 🟡 intermediate | 16.8  | Async submit lifecycle: idle → submitting → success/error, no double submits, abort on unmount.                                        |
| [useForm](docs/custom-hooks/use-form.md)                                   | Forms & input               | 🔴 advanced     | 19.0  | A small form controller: `register()`, sync + async validation, dirty state, async submit and focus on the first invalid field.        |
| [useFieldArray](docs/custom-hooks/use-field-array.md)                      | Forms & input               | 🟡 intermediate | 16.8  | Dynamic form rows with append/remove/move/update and stable generated keys.                                                            |
| [useMultiStepForm](docs/custom-hooks/use-multi-step-form.md)               | Forms & input               | 🟡 intermediate | 16.8  | Wizard navigation: steps, progress, next/back with per-step validation and jumping to visited steps.                                   |
| [useFocusTrap](docs/custom-hooks/use-focus-trap.md)                        | Accessibility & interaction | 🔴 advanced     | 16.8  | Keep Tab/Shift+Tab inside a container, set initial focus and restore focus afterwards — for overlays that cannot be a native <dialog>. |
| [useRovingTabIndex](docs/custom-hooks/use-roving-tab-index.md)             | Accessibility & interaction | 🟡 intermediate | 19.0  | WAI-ARIA roving tabindex: one Tab stop per widget, arrow keys/Home/End inside, disabled items skipped.                                 |
| [useKeyboardShortcut](docs/custom-hooks/use-keyboard-shortcut.md)          | Accessibility & interaction | 🟡 intermediate | 16.8  | Keyboard shortcuts like `mod+k` or `shift+?`: platform-aware, ignored while typing, cleaned up.                                        |
| [useEscapeKey](docs/custom-hooks/use-escape-key.md)                        | Accessibility & interaction | 🟢 beginner     | 16.8  | Close overlays with Escape — only the topmost layer reacts, so nested popovers close one at a time.                                    |
| [useAnnouncer](docs/custom-hooks/use-announcer.md)                         | Accessibility & interaction | 🟡 intermediate | 16.8  | Polite or assertive screen-reader announcements through one shared, SSR-safe aria-live region.                                         |
| [useDisclosure](docs/custom-hooks/use-disclosure.md)                       | Accessibility & interaction | 🟢 beginner     | 18.0  | Open/close state with ARIA-wired trigger and panel props (`aria-expanded`, `aria-controls`, `useId`).                                  |
| [useDialogState](docs/custom-hooks/use-dialog-state.md)                    | Accessibility & interaction | 🟡 intermediate | 18.0  | Drive a native <dialog> as a modal: showModal/close, state synced with close/cancel events, focus restored to the trigger.             |
| [useOrientation](docs/custom-hooks/use-orientation.md)                     | Device & preferences        | 🟢 beginner     | 18.0  | Screen orientation type and angle from the Screen Orientation API, with a media-query fallback.                                        |
| [useVibration](docs/custom-hooks/use-vibration.md)                         | Device & preferences        | 🟢 beginner     | 16.8  | Haptic feedback with `navigator.vibrate` — feature-detected, cancellable, cleaned up.                                                  |
| [useBattery](docs/custom-hooks/use-battery.md)                             | Device & preferences        | 🟡 intermediate | 18.0  | Battery level and charging state from `navigator.getBattery()` — Chromium-only, with a privacy warning.                                |
| [usePointerPosition](docs/custom-hooks/use-pointer-position.md)            | Device & preferences        | 🟡 intermediate | 16.8  | Pointer coordinates over the window or an element, throttled to one update per animation frame.                                        |
| [useDevicePixelRatio](docs/custom-hooks/use-device-pixel-ratio.md)         | Device & preferences        | 🟡 intermediate | 18.0  | Live `devicePixelRatio` using the `(resolution: Xdppx)` media-query re-subscription trick.                                             |
| [useSpeechRecognition](docs/custom-hooks/use-speech-recognition.md)        | Device & preferences        | 🔴 advanced     | 16.8  | Speech-to-text with the Web Speech API: start/stop/abort, interim results, error states, mic permission on demand.                     |
| [useSpeechSynthesis](docs/custom-hooks/use-speech-synthesis.md)            | Device & preferences        | 🟡 intermediate | 18.0  | Text-to-speech: async voice loading, speak/pause/resume/cancel and speaking state.                                                     |
| [useEventEmitter](docs/custom-hooks/use-event-emitter.md)                  | Advanced patterns           | 🟡 intermediate | 16.8  | Subscribe components to a shared, typed event bus built with a tiny `createEmitter<Events>()`.                                         |
| [useSubscription](docs/custom-hooks/use-subscription.md)                   | Advanced patterns           | 🔴 advanced     | 18.0  | Read any `{ subscribe, getCurrentValue }` source safely — a thin layer over `useSyncExternalStore` with snapshot caching.              |
| [useExternalStore](docs/custom-hooks/use-external-store.md)                | Advanced patterns           | 🔴 advanced     | 18.0  | A teaching version of Zustand’s core: `createStore()` + a selector hook that skips renders when the selected slice is unchanged.       |
| [useObservable](docs/custom-hooks/use-observable.md)                       | Advanced patterns           | 🔴 advanced     | 16.8  | Render the latest value of any `subscribe(observer)` source — RxJS Observables, Subjects, BehaviorSubjects — without importing RxJS.   |
| [useStateMachine](docs/custom-hooks/use-state-machine.md)                  | Advanced patterns           | 🔴 advanced     | 19.2  | Typed finite state machine on `useReducer`: states, discriminated-union events, guards, context and entry effects with cleanup.        |
| [useFeatureFlag / useFeatureFlags](docs/custom-hooks/use-feature-flag.md)  | Advanced patterns           | 🟡 intermediate | 19.0  | Typed feature flags from a provider, with an optional remote source and per-browser overrides in localStorage.                         |
| [usePermission](docs/custom-hooks/use-permission.md)                       | Advanced patterns           | 🟡 intermediate | 18.0  | Live permission state (`granted`/`denied`/`prompt`) from `navigator.permissions.query()` — never prompts.                              |
| [useOptimisticMutation](docs/custom-hooks/use-optimistic-mutation.md)      | Advanced patterns           | 🔴 advanced     | 16.8  | Optimistic updates with automatic, concurrency-safe rollback for state you own outside Actions.                                        |
| [useWebWorker](docs/custom-hooks/use-web-worker.md)                        | Advanced patterns           | 🔴 advanced     | 16.8  | Typed messages to a lazily spawned Web Worker, terminated on unmount — demoed by counting primes off the main thread.                  |
| [usePerformanceMeasure](docs/custom-hooks/use-performance-measure.md)      | Advanced patterns           | 🟡 intermediate | 18.0  | Time async work with User Timing marks/measures and collect results via `PerformanceObserver` where supported.                         |

<!-- catalog:custom:end -->

## Real-world scenarios

<!-- catalog:scenario:start -->

| Topic                                                                                                  | Category                    | Level           | React | Summary                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------ | --------------------------- | --------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Search with cancellation](docs/scenarios/search-with-cancellation.md)                                 | Data & networking           | 🟡 intermediate | 18.0  | Search-as-you-type that debounces input, aborts stale requests and can never show an older response.                                                                                                                       |
| [Server-driven data table](docs/scenarios/data-table.md)                                               | Data & networking           | 🟡 intermediate | 18.0  | Paginated, sortable, filterable product table that keeps the current page visible while the next one loads.                                                                                                                |
| [Infinite scroll with a “Load more” fallback](docs/scenarios/infinite-scroll-feed.md)                  | Data & networking           | 🟡 intermediate | 18.0  | Product feed that loads pages with an IntersectionObserver sentinel, keeps a real button, and handles end-of-list and errors.                                                                                              |
| [Shopping cart (reducer + localStorage)](docs/scenarios/shopping-cart.md)                              | State & persistence         | 🟡 intermediate | 18.0  | Cart with typed reducer actions, totals derived during render, validated persistence and Intl currency formatting.                                                                                                         |
| [Optimistic updates with rollback](docs/scenarios/optimistic-rollback.md)                              | Data & networking           | 🔴 advanced     | 18.0  | Todo list that applies add/toggle/delete instantly, marks pending items and rolls back failures with a message.                                                                                                            |
| [Theme switching (light / dark / system)](docs/scenarios/theme-switching.md)                           | Preferences & theming       | 🟡 intermediate | 18.0  | Persisted light/dark/system theme for a scoped container that follows the OS live and respects reduced motion.                                                                                                             |
| [Persistent preferences with schema migration](docs/scenarios/persistent-preferences.md)               | State & persistence         | 🔴 advanced     | 18.0  | Settings form saved with a versioned storage envelope, migrated from v1 to v2 on read, synced across tabs, resettable.                                                                                                     |
| [Polling dashboard](docs/scenarios/polling-dashboard.md)                                               | Real-time                   | 🟡 intermediate | 18.0  | KPI cards that poll /api/stats, pause when the tab is hidden or the device is offline, and show trends and last-updated time.                                                                                              |
| [Live notifications over WebSocket](docs/scenarios/live-notifications.md)                              | Real-time                   | 🔴 advanced     | 18.0  | Notification centre on a WebSocket with connection status, automatic reconnect, unread count and screen-reader announcements.                                                                                              |
| [Race-safe data fetching](docs/scenarios/race-safe-fetching.md)                                        | Data & networking           | 🟡 intermediate | 18.0  | Side-by-side profile switcher: a naive fetch-in-effect that shows stale data vs. a reusable hook built on useFetch.                                                                                                        |
| [Autocomplete (APG combobox)](docs/scenarios/autocomplete-combobox.md)                                 | Interaction & accessibility | 🔴 advanced     | 18.0  | An accessible autocomplete: APG combobox + listbox, aria-activedescendant, debounced race-safe suggestions, highlighted matches and announced result counts.                                                               |
| [Multi-step form wizard](docs/scenarios/multi-step-form-wizard.md)                                     | Forms                       | 🔴 advanced     | 18.0  | Account → profile → review sign-up with per-step validation, a sessionStorage draft that survives reloads, focus moved to each step heading and a guarded final submit.                                                    |
| [Toast notifications](docs/scenarios/toast-notifications.md)                                           | Interaction & accessibility | 🔴 advanced     | 19.2  | A context-based toast system with auto-dismiss that pauses on hover, focus and hidden tabs, a capped visible stack with a queue, and polite vs assertive announcements.                                                    |
| [Modal dialog with nested confirm](docs/scenarios/modal-dialog.md)                                     | Interaction & accessibility | 🟡 intermediate | 18.0  | An edit dialog on native <dialog>: focus moves in and back, the page is inert, Escape closes, return values report the outcome and a nested “Discard changes?” only answers the topmost Escape.                            |
| [Dropdown menu (APG menu button)](docs/scenarios/dropdown-menu-button.md)                              | Interaction & accessibility | 🔴 advanced     | 18.0  | A menu button with actions, check items and a radio group: roving tabindex, first-letter typeahead, Escape/Tab/click-outside to close and focus returned to the button.                                                    |
| [Tabs with automatic and manual activation](docs/scenarios/tabs-activation.md)                         | Interaction & accessibility | 🟡 intermediate | 19.2  | APG tabs with a switch between automatic and manual activation, arrow/Home/End keys, full tab ↔ panel labelling, and lazy panels kept alive with <Activity>.                                                               |
| [Auth-protected UI](docs/scenarios/auth-protected-ui.md)                                               | Authentication              | 🔴 advanced     | 19.0  | Sign-in with POST /api/login, a token kept in memory, /api/me with a Bearer header, protected and role-gated sections, sign-out and server-side session expiry.                                                            |
| [Form Actions with optimistic updates](docs/scenarios/form-actions-optimistic.md)                      | Forms                       | 🔴 advanced     | 19.0  | A todo list built from React 19 primitives: <form action>, useActionState for results, useFormStatus for the pending button and useOptimistic with automatic rollback.                                                     |
| [Command palette (⌘K / Ctrl+K)](docs/scenarios/command-palette.md)                                     | Interaction & accessibility | 🔴 advanced     | 18.0  | A platform-aware ⌘K / Ctrl+K palette in a native modal dialog with a grouped combobox, keyboard navigation, route and local commands, and recent commands in localStorage.                                                 |
| [Undo/redo note editor](docs/scenarios/undo-redo-editor.md)                                            | Editing & interaction       | 🟡 intermediate | 18.0  | A note editor with coalesced typing history, scoped Ctrl/⌘+Z · Shift+Ctrl/⌘+Z · Ctrl+Y shortcuts and a clickable history panel.                                                                                            |
| [Drag-and-drop reordering (pointer + keyboard)](docs/scenarios/sortable-drag-and-drop.md)              | Editing & interaction       | 🔴 advanced     | 18.0  | A sortable list driven by Pointer Events, with a complete keyboard mode, single-click move buttons, live-region announcements and reduced-motion support.                                                                  |
| [Chunked file upload with cancel and retry](docs/scenarios/chunked-file-upload.md)                     | Files & media               | 🔴 advanced     | 18.0  | Picker + drop zone, client-side validation, chunked uploads with per-file progress, cancel, resumable retry and a concurrency limit — against a mocked endpoint.                                                           |
| [Image previews with object URLs](docs/scenarios/image-preview-object-urls.md)                         | Files & media               | 🟡 intermediate | 18.0  | Local image previews with `URL.createObjectURL`, revoked on removal, replacement and unmount, with dimensions and required alt text.                                                                                       |
| [Copy to clipboard with feedback and fallback](docs/scenarios/clipboard-copy-paste.md)                 | Editing & interaction       | 🟡 intermediate | 18.0  | Copy buttons with visible and announced feedback, a select-the-text fallback in insecure contexts, and an optional paste button with a permission note.                                                                    |
| [Responsive layout: container vs viewport](docs/scenarios/responsive-layout-switching.md)              | Architecture                | 🟡 intermediate | 18.0  | One settings screen rendered as a sidebar, tabs or stacked sections, chosen by the container width (useElementSize) or the viewport (useMediaQuery) — and when to use CSS instead.                                         |
| [Searching 10,000 rows: deferred, memoised, windowed](docs/scenarios/large-list-search-performance.md) | Performance                 | 🔴 advanced     | 18.0  | A 10k-item search rendered naively, with useDeferredValue or useTransition + memoised rows, and with a fixed-height window — with timings measured live.                                                                   |
| [Observable store with selector subscriptions](docs/scenarios/selector-based-external-store.md)        | Architecture                | 🟡 intermediate | 18.0  | An external store read through selectors (useExternalStore), the raw useSyncExternalStore primitive and an RxJS view (useObservable) — with render counts proving unrelated components stay still.                         |
| [ESP trading desk: ticket, blotter and positions](docs/scenarios/esp-trading-blotter.md)               | Architecture                | 🔴 advanced     | 19.0  | Three independent useEspReducer stores on one esp-js router: a risk-checked order ticket, a trade blotter and a position summary, with an event inspector.                                                                 |
| [Error recovery: boundaries, async errors and retries](docs/scenarios/error-boundaries-and-retry.md)   | Resilience                  | 🟡 intermediate | 18.0  | A resettable error boundary with “Try again” and reset keys, event-handler and effect errors surfaced through state, and a flaky request retried with useRetry — all reported to an on-screen mock reporter.               |
| [Offline banner and persisted action queue](docs/scenarios/offline-action-queue.md)                    | Resilience                  | 🔴 advanced     | 19.2  | An offline banner from useOnlineStatus, connection hints from useNetworkInformation, and an outbox persisted in localStorage that replays when the app is back online — with a clearly labelled “simulate offline” switch. |

<!-- catalog:scenario:end -->

## State management & middleware guide

The [comparison page](docs/state-management/state-management-comparison.md)
explains how React hooks, event middleware (esp-js), reducer middleware,
external-store subscriptions, Redux Toolkit, Zustand, Jotai and server-state
libraries differ and when to choose each. Optional libraries are only imported
by their own demos, which the playground lazy-loads, so the main bundle does
not depend on them.

<!-- catalog:state:start -->

| Topic                                                                                    | Category              | Level           | React | Summary                                                                                                                                 |
| ---------------------------------------------------------------------------------------- | --------------------- | --------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------- |
| [useState vs useReducer](docs/state-management/usestate-vs-usereducer.md)                | Reducers & middleware | 🟢 beginner     | 16.8  | The same booking widget built twice: rules spread over handlers vs one pure, testable reducer.                                          |
| [useReducer + dispatch middleware](docs/state-management/reducer-middleware-pipeline.md) | Reducers & middleware | 🔴 advanced     | 18.0  | Logger, analytics, validation, thunk, error reporting and persistence composed around one reducer — toggle each and watch the pipeline. |
| [Undo/redo reducer enhancer](docs/state-management/undo-redo-reducer-enhancer.md)        | Reducers & middleware | 🟡 intermediate | 16.8  | `undoable(reducer)` adds past/present/future and UNDO/REDO to any reducer — an enhancer, not middleware.                                |
| [Context + reducer (split contexts)](docs/state-management/context-reducer-split.md)     | Reducers & middleware | 🟡 intermediate | 19.0  | Share a reducer through separate state and dispatch contexts so dispatch-only components never re-render.                               |
| [External store + useSyncExternalStore](docs/state-management/external-reducer-store.md) | Reducers & middleware | 🔴 advanced     | 18.0  | `createReducerStore` outside React, read with selectors through `useStoreSelector`; timers dispatch without hooks.                      |
| [Redux Toolkit + React Redux](docs/state-management/redux-toolkit.md)                    | Libraries             | 🟡 intermediate | 18.0  | `configureStore`, `createSlice`, `createAsyncThunk` against /api/todos, typed hooks, a custom middleware and the listener middleware.   |
| [Zustand](docs/state-management/zustand.md)                                              | Libraries             | 🟡 intermediate | 18.0  | A store with state and actions, selectors, `useShallow`, and `persist` + `devtools` middleware — one store per mount.                   |
| [Jotai](docs/state-management/jotai.md)                                                  | Libraries             | 🟡 intermediate | 18.0  | Primitive, derived, async and write-only atoms (Jotai 3), with Suspense for an async profile atom.                                      |
| [TanStack Query (server state)](docs/state-management/tanstack-query.md)                 | Libraries             | 🟡 intermediate | 18.0  | `useQuery` + `useMutation` against /api/todos with an optimistic add, rollback on error and invalidation.                               |
| [SWR (stale-while-revalidate)](docs/state-management/swr.md)                             | Libraries             | 🟡 intermediate | 16.11 | `useSWR` keyed by URL plus an optimistic PATCH with `mutate`, `optimisticData`, `populateCache` and `rollbackOnError`.                  |
| [RxJS observable store](docs/state-management/rxjs-observable-store.md)                  | Libraries             | 🔴 advanced     | 18.0  | A BehaviorSubject store read with `useSyncExternalStore`, and a debounced, cancellable search pipeline.                                 |
| [Choosing a state approach](docs/state-management/state-management-comparison.md)        | Libraries             | 🟡 intermediate | 16.8  | React hooks vs event middleware vs reducer middleware vs external stores vs Redux, Zustand, Jotai and server-state caches.              |

<!-- catalog:state:end -->

## ESP-JS integration pages

<!-- catalog:esp:start -->

| Topic                                                                                        | Category           | Level           | React | Summary                                                                                                                 |
| -------------------------------------------------------------------------------------------- | ------------------ | --------------- | ----- | ----------------------------------------------------------------------------------------------------------------------- |
| [ESP-JS middleware for React hooks — architecture](docs/esp-js/esp-middleware-overview.md)   | ESP-JS integration | 🔴 advanced     | 19.0  | How the original esp-js wrapper connects an event router to React reducers through dispatch middleware.                 |
| [Original workspace & tiles (migrated)](docs/esp-js/esp-original-workspace.md)               | ESP-JS integration | 🔴 advanced     | 19.0  | The repository's original esp-js demo — workspace, price tile and accumulators tile — running on React 19 and esp-js 8. |
| [Observation stages, filtering & commits](docs/esp-js/esp-stages-and-filtering.md)           | ESP-JS integration | 🔴 advanced     | 19.0  | Cancel events at the preview stage and commit them at the normal stage before they reach React state.                   |
| [Error isolation: keeping the router alive](docs/esp-js/esp-error-isolation.md)              | ESP-JS integration | 🔴 advanced     | 19.0  | Why a throwing reducer would halt esp-js permanently, and how the bridge contains it.                                   |
| [Migration: esp-js 2 + React 16.8 → esp-js 8 + React 19](docs/esp-js/esp-migration-notes.md) | ESP-JS integration | 🟡 intermediate | 19.0  | What changed when the original integration was upgraded, and why.                                                       |

<!-- catalog:esp:end -->

## Rules of Hooks & anti-patterns

Hooks must be called unconditionally at the top level of components and custom
hooks, because React identifies each hook by its call order. The pages below
show violations next to corrected versions. Intentionally broken code lives in
`src/examples/anti-patterns/broken/`, which is excluded from type-checking,
linting, tests and the bundle and only displayed as text.

<!-- catalog:anti-pattern:start -->

| Topic                                                                                               | Category       | Level           | React | Summary                                                                                                              |
| --------------------------------------------------------------------------------------------------- | -------------- | --------------- | ----- | -------------------------------------------------------------------------------------------------------------------- |
| [Rules of Hooks](docs/anti-patterns/rules-of-hooks.md)                                              | Rules of Hooks | 🟢 beginner     | 16.8  | Call Hooks only at the top level of components and custom Hooks — never conditionally, in loops or in callbacks.     |
| [Why call order matters (Hook slots)](docs/anti-patterns/hook-call-order.md)                        | Rules of Hooks | 🟡 intermediate | 16.8  | A visual simulation of React’s per-component list of Hook slots, and how a conditional call shifts them.             |
| [Custom Hooks share logic, not state](docs/anti-patterns/custom-hooks-share-logic.md)               | Rules of Hooks | 🟢 beginner     | 16.8  | Two components calling the same custom Hook get two independent states.                                              |
| [How eslint-plugin-react-hooks detects violations](docs/anti-patterns/eslint-plugin-react-hooks.md) | Rules of Hooks | 🟡 intermediate | 16.8  | rules-of-hooks and exhaustive-deps plus the React Compiler-powered rules this project runs.                          |
| [Effect chains & derived state in effects](docs/anti-patterns/effect-chains-derived-state.md)       | Anti-patterns  | 🟢 beginner     | 16.8  | Copying computable values into state via effects causes extra renders and stale frames — compute them during render. |
| [Fetching without cleanup](docs/anti-patterns/fetch-without-cleanup.md)                             | Anti-patterns  | 🟡 intermediate | 16.8  | Without cleanup, the last response wins — not the last request. Abort or ignore stale requests.                      |
| [Object dependencies causing infinite loops](docs/anti-patterns/object-deps-infinite-loop.md)       | Anti-patterns  | 🟡 intermediate | 16.8  | An object created during render is new every time; as an effect dependency with a setState inside, it loops forever. |
| [Mutating state](docs/anti-patterns/mutating-state.md)                                              | Anti-patterns  | 🟢 beginner     | 16.8  | React compares state by reference; mutate in place and updates are skipped or leak into old renders.                 |
| [Index as key for stateful items](docs/anti-patterns/index-as-key.md)                               | Anti-patterns  | 🟢 beginner     | 16.8  | With key={index}, inserting or removing items makes rows inherit another item’s state.                               |
| [Putting everything in one context](docs/anti-patterns/one-big-context.md)                          | Anti-patterns  | 🟡 intermediate | 19.0  | One context with a fresh object value re-renders every consumer on any change; split by concern.                     |
| [Overusing memoization](docs/anti-patterns/overusing-memoization.md)                                | Anti-patterns  | 🟢 beginner     | 16.8  | useMemo/useCallback on everything adds code and dependency bugs without making anything faster.                      |
| [Reading refs during render](docs/anti-patterns/reading-refs-during-render.md)                      | Anti-patterns  | 🟡 intermediate | 16.8  | ref.current is not reactive and may be written by renders React discards; read refs in handlers and effects.         |
| [setState during render (render loops)](docs/anti-patterns/set-state-during-render.md)              | Anti-patterns  | 🟢 beginner     | 16.8  | Unconditional setState while rendering loops until React throws “Too many re-renders”.                               |

<!-- catalog:anti-pattern:end -->

## Testing guide pages

<!-- catalog:testing:start -->

| Topic                                                                                            | Category            | Level           | React | Summary                                                                                                                   |
| ------------------------------------------------------------------------------------------------ | ------------------- | --------------- | ----- | ------------------------------------------------------------------------------------------------------------------------- |
| [Testing custom hooks with renderHook](docs/testing/testing-custom-hooks.md)                     | Unit testing        | 🟢 beginner     | 18.0  | Render a hook in a throwaway component, drive it with `act`, and assert on `result.current`.                              |
| [Fake timers for debounce, intervals and retries](docs/testing/testing-fake-timers.md)           | Unit testing        | 🟡 intermediate | 16.8  | Control time deterministically with `vi.useFakeTimers()` and `vi.advanceTimersByTime()`.                                  |
| [Network tests with Mock Service Worker](docs/testing/testing-network-msw.md)                    | Integration testing | 🟡 intermediate | 16.8  | One set of request handlers serves the playground in the browser and every test in Node.                                  |
| [Testing browser APIs jsdom does not implement](docs/testing/testing-browser-apis.md)            | Unit testing        | 🟡 intermediate | 16.8  | Install fakes for `matchMedia`, `IntersectionObserver` and `ResizeObserver` per test — and test the unsupported path too. |
| [Server-rendering tests](docs/testing/testing-ssr.md)                                            | Integration testing | 🔴 advanced     | 18.0  | Prove hooks can render on the server by running `renderToString` in a Node environment without a DOM.                     |
| [Strict Mode, accessibility and end-to-end checks](docs/testing/testing-strict-mode-and-a11y.md) | Integration testing | 🔴 advanced     | 18.0  | Render under `<StrictMode>` to catch missing cleanups; query by role; run axe in Playwright against the production build. |

<!-- catalog:testing:end -->

## Code examples

Debounced, race-safe search (from the custom hooks library):

```tsx
import { useState } from 'react';
import { useDebounce, useFetch } from './src/hooks';

function Search() {
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query, 300);
  // Aborts the previous request whenever the URL changes or on unmount.
  const result = useFetch<{ results: string[] }>(
    debounced ? `/api/search?q=${encodeURIComponent(debounced)}` : null,
  );
  return (
    <>
      <input aria-label="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
      {result.status === 'pending' && <p>Loading…</p>}
      {result.status === 'error' && <p role="alert">{result.error.message}</p>}
      {result.status === 'success' && (
        <ul>
          {result.data.results.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      )}
    </>
  );
}
```

Persisted, validated, cross-tab state:

```ts
const isTheme = (value: unknown): value is 'light' | 'dark' =>
  value === 'light' || value === 'dark';
const [theme, setTheme, resetTheme] = useLocalStorage('app:theme', 'light', { validate: isTheme });
```

A reducer with Redux-style middleware:

```ts
import { useReducerWithMiddleware, type Middleware } from './src/middleware/reducer';

const logger: Middleware<State, Action> = (api) => (next) => (action) => {
  console.log('before', api.getState(), action);
  next(action);
  console.log('after', api.getState()); // already updated — the store is synchronous
};

const [state, dispatch] = useReducerWithMiddleware(reducer, initialState, [logger]);
```

Two tiles talking through esp-js:

```tsx
import { useEspReducer } from './src/middleware/esp-js';

const [state, dispatch, esp] = useEspReducer(reducer, initialState, {
  modelName: 'accumulators',
  observedEvents: [KEY_PRESSED],
});
esp.publish(KEY_PRESSED, { key: 'Delete' }); // only this tile
esp.broadcast(KEY_PRESSED, { key: 'Insert' }); // every tile observing KEY_PRESSED
```

## Repository structure

```text
react-hooks-esp-middleware-example/
├── src/
│   ├── hooks/              # custom hooks library (React only), one folder per category
│   ├── middleware/
│   │   ├── esp-js/         # the esp-js ⇄ reducer middleware integration
│   │   └── reducer/        # Redux-style middleware for React reducers (+ concrete middleware)
│   ├── esp-demo/           # the original workspace + tiles demo, migrated
│   ├── examples/           # demos: built-in/, custom-hooks/, scenarios/, state-management/, esp-js/, anti-patterns/
│   ├── catalog/            # typed metadata for every topic (drives playground + docs)
│   ├── components/ui/      # accessible UI kit used by demos
│   ├── app/                # playground shell: router, pages, layout
│   ├── mocks/              # MSW handlers for the mocked /api (browser + tests)
│   └── test/               # test setup, MSW server, browser API fakes
├── docs/                   # generated reference + CONVENTIONS.md
├── e2e/                    # Playwright + axe tests
├── scripts/                # docs generator
└── .github/                # CI, Pages deploy, Dependabot, templates
```

## Testing

- **Unit & integration:** `npm test` runs two Vitest projects — `dom`
  (jsdom; every `*.test.ts(x)`) and `ssr` (Node, no DOM; every
  `*.ssr.test.tsx`, which renders hooks with `renderToString`).
- **Network:** MSW intercepts `fetch` and `WebSocket` with the same handlers
  the playground uses; unknown requests fail the test.
- **Browser APIs:** opt-in fakes for `matchMedia`, `IntersectionObserver` and
  `ResizeObserver` in `src/test/browserMocks.ts`, so unsupported paths are
  tested too.
- **Accessibility:** axe-core runs in selected component tests; Playwright
  runs axe on real pages (`npm run test:e2e`).
- **Catalog integrity:** `src/catalog/catalog.test.ts` fails if a topic points
  at a missing file, links to an unknown topic, or if an exported hook is
  undocumented.

## TypeScript guidance

- Strict mode with `noUncheckedIndexedAccess` and `verbatimModuleSyntax`.
- Generic hooks (`useLocalStorage<T>`, `useFetch<T>`), discriminated unions
  for async state (`status: 'idle' | 'pending' | 'success' | 'error'`), state
  machines and reducer actions with exhaustive `never` checks.
- No `any`; unknown errors are normalised with a shared `toError`.
- Validate untrusted data (storage, network) with type guards before trusting
  its type.

## Performance guidance

- Measure first (React DevTools Profiler, the `<Profiler>`-based
  `RenderCount` in demos). Do not add `useMemo`/`useCallback` everywhere.
- Prefer moving state down, splitting contexts, and deriving values during
  render. Use `useTransition` / `useDeferredValue` to keep input responsive.
- React Compiler can memoize automatically; this project lints with the
  compiler-powered rules but does not enable the compiler in the build, so
  the manual-memoization demos stay observable.

## SSR & browser compatibility

- Hooks never touch `window`/`document` during render; browser state is read
  through `useSyncExternalStore` with a server snapshot, or in effects.
- Browser-limited APIs (Network Information, Battery, Speech, Fullscreen,
  Vibration…) expose `isSupported` and are labelled on their pages.
- **esp-js 8 is client-only:** its UMD bundle reads the global `self` when it
  is imported, so it cannot be imported during Node SSR without a shim (an SSR
  test documents this).

## Accessibility

- Native elements first (`<button>`, `<dialog>`, `<form>`), labelled inputs,
  visible focus, keyboard support following the
  [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/), reduced
  motion respected.
- The playground has a skip link, moves focus to new content on navigation,
  and is checked with axe in CI.

## Troubleshooting

| Problem                                        | Fix                                                                                                      |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Network demos fail / `[mock api]` warning      | The mock API needs Service Workers: use `localhost` or HTTPS, and not a private window that blocks them. |
| A demo behaves differently with Strict Mode on | Expected: development-only double rendering/effects. Toggle it per demo to compare.                      |
| `npm run docs:check` fails                     | Run `npm run docs:generate` and commit the result.                                                       |
| Tests hang with fake timers                    | See the timer notes in [docs/CONVENTIONS.md](docs/CONVENTIONS.md#tests).                                 |
| `npm ci` fails on old Node                     | Use Node 22.12+ (`nvm use`).                                                                             |

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) and the
[code & content conventions](docs/CONVENTIONS.md). Please follow the
[Code of Conduct](CODE_OF_CONDUCT.md) and report security issues privately
([SECURITY.md](SECURITY.md)). Changes are recorded in the
[CHANGELOG](CHANGELOG.md).

## Roadmap

- Render Mermaid diagrams inside the playground (they already render in the
  generated docs on GitHub).
- Run the component tests in a real browser (Vitest browser mode) for
  APIs jsdom cannot emulate.
- Optional React Compiler build to compare manual and automatic memoization.
- More esp-js examples (decorator-based models via `observeEvent`).
- Split the catalog into a small search index plus lazily loaded topic
  details (the catalog chunk is ~215 kB gzipped today).

## License

This repository does not currently include a license file, so all rights are
reserved by the author by default. The project depends on
[esp-js](https://github.com/esp/esp-js), which is licensed under Apache-2.0,
and on other open-source packages under their own licenses.

## Official React documentation

- [Built-in React Hooks](https://react.dev/reference/react/hooks)
- [Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks)
- [Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)
- [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)
- [Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects)
- [React Compiler](https://react.dev/learn/react-compiler)
- [React 19 release](https://react.dev/blog/2024/12/05/react-19)
- [eslint-plugin-react-hooks](https://www.npmjs.com/package/eslint-plugin-react-hooks)
