# Contributing

Thanks for helping improve the React Hooks Playground! This project is a
learning resource first, so clarity and correctness matter more than volume.

## Getting started

```bash
git clone https://github.com/aqkprogrammer/react-hooks-esp-middleware-example.git
cd react-hooks-esp-middleware-example
npm ci            # Node 22.12+ (see .nvmrc)
npm run dev       # http://localhost:5173
npm test          # unit + integration tests
npm run check     # everything CI runs (types, lint, format, docs, tests, build)
```

End-to-end tests build the app and run Playwright with axe:

```bash
npx playwright install chromium   # once
npm run test:e2e
```

## What makes a good contribution

- **A hook that earns its place.** It solves a real problem that a built-in
  hook or a short inline effect does not, and it is not a renamed built-in.
- **Correct under React's rules.** Pure render, full cleanup, no stale
  closures, SSR-safe, works in Strict Mode.
- **Honest about limits.** Browser support, permissions, privacy, and when a
  mature library (TanStack Query, React Hook Form, …) is the better choice.
- **Tested through behaviour.** Tests assert what users and callers observe,
  including cleanup and failure paths.

## Adding a hook, demo or scenario

1. Read [docs/CONVENTIONS.md](docs/CONVENTIONS.md).
2. Add the code (`src/hooks/<category>/useThing.ts`) and export it from the
   category `index.ts`.
3. Add tests next to it (`useThing.test.ts(x)`).
4. Add a demo (`src/examples/...Demo.tsx`, default export) and a demo test.
5. Add a catalog entry in `src/catalog/entries/<file>.ts`.
6. Run `npm run docs:generate` — the Markdown in `docs/` and the tables in
   `README.md` are generated from the catalog; never edit them by hand.
7. Run `npm run check`.

## Documentation contributions

Prose lives in the catalog entries (`src/catalog/entries/*.ts`) so the
playground, the generated docs and the README stay in sync. Hand-written
documents are `README.md` (outside the generated blocks),
`docs/CONVENTIONS.md`, and this file. Keep claims verifiable: link to
react.dev, MDN or the library's docs, and don't state benchmarks or browser
support you haven't checked.

## Commit and PR guidelines

- Keep pull requests focused; describe the problem and the approach.
- Fill in the pull request template checklist.
- CI must pass. Don't disable lint rules or skip tests to get green — fix the
  cause, or explain a targeted, justified suppression inline.

## Code of conduct

Participation is governed by the [Code of Conduct](CODE_OF_CONDUCT.md).
