import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

/**
 * Lazy module maps resolved by Vite at build time. Keys look like
 * `/src/examples/...`. Catalog paths are relative to `src/`.
 *
 * - Demos are code-split: optional libraries (Redux, Zustand, …) only load
 *   when their demo is opened.
 * - Sources are loaded as raw text, so the code viewer always shows the exact
 *   file that runs — snippets can never go stale.
 */
const demoModules = import.meta.glob<{ default: ComponentType }>([
  '/src/examples/**/*.tsx',
  '!/src/**/*.test.tsx',
  '!/src/examples/anti-patterns/broken/**',
]);

const rawModules = import.meta.glob<string>(['/src/**/*.{ts,tsx,css}', '!/src/**/*.d.ts'], {
  query: '?raw',
  import: 'default',
});

/**
 * `lazy()` wrappers are created once at module scope (nothing is fetched
 * until a demo renders), so render code only *looks up* components — it
 * never creates new component types during render.
 */
export const demos: Readonly<Record<string, LazyExoticComponent<ComponentType>>> =
  Object.fromEntries(
    Object.entries(demoModules).map(([key, loader]) => [key.replace(/^\/src\//, ''), lazy(loader)]),
  );

const sourceCache = new Map<string, Promise<string>>();

/** Cached so `use()` receives the same promise on every render. */
export function loadSource(path: string): Promise<string> {
  let promise = sourceCache.get(path);
  if (!promise) {
    const loader = rawModules[`/src/${path}`];
    promise = loader ? loader() : Promise.reject(new Error(`Source not found: ${path}`));
    sourceCache.set(path, promise);
  }
  return promise;
}
