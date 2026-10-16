import { createContext, type Context } from 'react';

/** Flags are booleans (on/off), strings (variants) or numbers (limits). */
export type FlagValue = boolean | number | string;
export type FlagValues = Record<string, FlagValue>;

export type FeatureFlagStatus = 'idle' | 'loading' | 'ready' | 'error';

/** Where the effective value of a flag came from (highest precedence first). */
export type FlagSource = 'override' | 'remote' | 'default';

export interface FeatureFlagsValue<F extends FlagValues> {
  /** Effective values: override → remote → default. */
  flags: Readonly<F>;
  defaults: Readonly<F>;
  remote: Readonly<Partial<F>>;
  overrides: Readonly<Partial<F>>;
  sourceOf: (name: keyof F & string) => FlagSource;
  /** Remote loading state. `idle` when the provider has no `load` function. */
  status: FeatureFlagStatus;
  error: Error | null;
  /** Local (this browser only) override, persisted to localStorage. */
  setOverride: <K extends keyof F & string>(name: K, value: F[K]) => void;
  clearOverride: (name: keyof F & string) => void;
  clearOverrides: () => void;
  /** Re-runs the provider's `load` function. */
  refresh: () => void;
}

export interface FeatureFlagDefinition<F extends FlagValues> {
  readonly defaults: Readonly<F>;
  /** localStorage key for local overrides. */
  readonly storageKey: string;
  /** Context shared by `FeatureFlagProvider` and the hooks. Not for direct use. */
  readonly context: Context<FeatureFlagsValue<F> | null>;
}

export interface DefineFeatureFlagsOptions {
  /** Default `feature-flags:overrides`. Use one key per flag set. */
  storageKey?: string;
}

/**
 * Declares a typed set of flags and their defaults. The defaults are the
 * single source of truth for **which flags exist and their types**: remote
 * payloads and stored overrides are filtered against them.
 *
 * ```ts
 * export const appFlags = defineFeatureFlags({ newCheckout: false, searchMode: 'exact' });
 * // narrower types: defineFeatureFlags<{ searchMode: 'exact' | 'fuzzy' }>({ searchMode: 'exact' })
 * ```
 *
 * Call it once at module level.
 */
export function defineFeatureFlags<F extends FlagValues>(
  defaults: F,
  options: DefineFeatureFlagsOptions = {},
): FeatureFlagDefinition<F> {
  return {
    defaults: Object.freeze({ ...defaults }),
    storageKey: options.storageKey ?? 'feature-flags:overrides',
    context: createContext<FeatureFlagsValue<F> | null>(null),
  };
}

/**
 * Keeps only known flag names whose value has the same `typeof` as the
 * default. Used for remote payloads and localStorage overrides, which are
 * both untrusted input.
 */
export function pickKnownFlags<F extends FlagValues>(defaults: F, input: unknown): Partial<F> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return {};
  const result: Partial<F> = {};
  for (const [name, value] of Object.entries(input as Record<string, unknown>)) {
    if (!Object.prototype.hasOwnProperty.call(defaults, name)) continue;
    if (typeof value !== typeof defaults[name]) continue;
    result[name as keyof F] = value as F[keyof F];
  }
  return result;
}
