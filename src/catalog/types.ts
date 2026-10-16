/**
 * The catalog is the single source of truth for everything the playground
 * lists. The same data renders the interactive pages, generates the Markdown
 * reference in /docs (scripts/generate-docs.ts) and is validated by
 * src/catalog/catalog.test.ts (unique ids, existing files, resolvable links).
 *
 * Text fields accept a tiny Markdown subset: `code`, **bold**, *emphasis* and
 * [links](https://example.com). Code fields (`signature`, `wrong`, `right`)
 * are plain source code.
 */

export type Section =
  'built-in' | 'custom' | 'scenario' | 'state' | 'esp' | 'testing' | 'anti-pattern';

export type Level = 'beginner' | 'intermediate' | 'advanced';

/**
 * - `universal`: works in every supported browser and on the server.
 * - `browser-limited`: relies on an API that some browsers lack; the hook
 *   feature-detects and reports `isSupported`.
 * - `client-only`: needs `window`/`document`; safe to render on the server but
 *   does nothing until hydration.
 */
export type SupportLevel = 'universal' | 'browser-limited' | 'client-only';

export interface DocLink {
  label: string;
  url: string;
}

export interface ApiParam {
  name: string;
  type: string;
  description: string;
  optional?: boolean;
}

export interface ApiReference {
  /** e.g. `function useDebounce<T>(value: T, delayMs: number): T` */
  signature: string;
  params?: ApiParam[];
  /** Description of the return value (Markdown subset). */
  returns?: string;
}

export interface Mistake {
  /** Short title, e.g. "Missing cleanup". */
  title: string;
  /** Incorrect code. */
  wrong: string;
  /** Why it fails (Markdown subset). */
  why: string;
  /** Corrected code. */
  right?: string;
}

export interface CatalogEntry {
  /** URL slug, unique across the catalog: lowercase kebab-case. */
  id: string;
  /** Display name, e.g. `useDebounce` or `Search with cancellation`. */
  title: string;
  section: Section;
  /** Grouping inside a section, e.g. "Timing & scheduling". */
  category: string;
  level: Level;
  /** One sentence shown on cards and in search results. */
  summary: string;
  /** Extra search keywords and use cases. */
  tags: string[];
  /**
   * Interactive demo, relative to `src/` (e.g.
   * `examples/custom-hooks/timing/UseDebounceDemo.tsx`). The module must
   * default-export a component that takes no props.
   */
  demo?: string;
  /** Source files shown in the code viewer, relative to `src/`. First = primary. */
  sources: string[];
  /** Test files that verify this entry, relative to `src/`. */
  tests?: string[];
  /** Minimum React version for the APIs used, e.g. "16.8", "18.0", "19.0", "19.2". */
  minReact: string;
  support?: { level: SupportLevel; notes?: string };
  officialDocs?: DocLink[];
  /** Ids of related catalog entries. */
  related?: string[];

  // ---- Documentation template -------------------------------------------
  /** Concept: what it does. */
  concept: string;
  /** Problem: why it is useful. */
  problem: string;
  whenToUse?: string[];
  whenNotToUse?: string[];
  api?: ApiReference;
  /** Execution flow: what happens during render, commit, effects and cleanup. */
  execution?: string[];
  mistakes?: Mistake[];
  edgeCases?: string[];
  /** How the behaviour is verified (Markdown subset). */
  testing?: string;
  production?: string[];
  /** Optional Mermaid diagram source (rendered on GitHub in the generated docs). */
  diagram?: { title: string; description: string; mermaid: string };
}
