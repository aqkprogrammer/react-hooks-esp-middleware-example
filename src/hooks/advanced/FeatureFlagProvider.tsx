import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { toError } from '../internal/env';
import { isAbortError } from '../internal/env';
import { useLocalStorage } from '../storage/useLocalStorage';
import {
  pickKnownFlags,
  type FeatureFlagDefinition,
  type FeatureFlagStatus,
  type FeatureFlagsValue,
  type FlagSource,
  type FlagValues,
} from './featureFlags';

export interface FeatureFlagProviderProps<F extends FlagValues> {
  definition: FeatureFlagDefinition<F>;
  /**
   * Optional remote source, called once after mount (never on the server) and
   * on `refresh()`. Resolve with any JSON-like object; unknown names and
   * wrongly-typed values are dropped. Abort the request when `signal` fires.
   * Keep it stable (module level or `useCallback`).
   */
  load?: (signal: AbortSignal) => Promise<unknown>;
  /** Allow local overrides from localStorage (default `true`). Disable in production builds if needed. */
  allowOverrides?: boolean;
  children: ReactNode;
}

interface RemoteState<F extends FlagValues> {
  status: FeatureFlagStatus;
  values: Partial<F>;
  error: Error | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Supplies the flags declared with `defineFeatureFlags` to `useFeatureFlag`
 * and `useFeatureFlags`.
 *
 * Effective value = local override → remote value → default. On the server
 * and before the remote load finishes, components see the defaults (plus
 * overrides after hydration), so the first paint never waits for the network.
 */
export function FeatureFlagProvider<F extends FlagValues>({
  definition,
  load,
  allowOverrides = true,
  children,
}: FeatureFlagProviderProps<F>) {
  const { defaults, storageKey, context: FlagContext } = definition;
  const [remote, setRemote] = useState<RemoteState<F>>(() => ({
    status: load ? 'loading' : 'idle',
    values: {},
    error: null,
  }));
  const [loadCount, setLoadCount] = useState(0);
  const [storedOverrides, setStoredOverrides, removeStoredOverrides] = useLocalStorage<
    Record<string, unknown>
  >(storageKey, {}, { validate: isRecord });

  useEffect(() => {
    if (!load) return;
    const controller = new AbortController();
    load(controller.signal).then(
      (payload) => {
        if (controller.signal.aborted) return;
        setRemote({ status: 'ready', values: pickKnownFlags(defaults, payload), error: null });
      },
      (reason: unknown) => {
        if (controller.signal.aborted || isAbortError(reason)) return;
        // Keep the last good remote values; defaults still apply underneath.
        setRemote((previous) => ({ ...previous, status: 'error', error: toError(reason) }));
      },
    );
    return () => controller.abort();
  }, [load, defaults, loadCount]);

  const refresh = useCallback(() => {
    if (!load) return;
    setRemote((previous) => ({ ...previous, status: 'loading', error: null }));
    setLoadCount((count) => count + 1);
  }, [load]);

  const overrides = useMemo(
    (): Partial<F> => (allowOverrides ? pickKnownFlags(defaults, storedOverrides) : {}),
    [allowOverrides, defaults, storedOverrides],
  );

  const setOverride = useCallback(
    <K extends keyof F & string>(name: K, value: F[K]) =>
      setStoredOverrides((previous) => ({ ...previous, [name]: value })),
    [setStoredOverrides],
  );
  const clearOverride = useCallback(
    (name: keyof F & string) =>
      setStoredOverrides((previous) => {
        const next = { ...previous };
        delete next[name];
        return next;
      }),
    [setStoredOverrides],
  );

  const value = useMemo((): FeatureFlagsValue<F> => {
    const flags = { ...defaults, ...remote.values, ...overrides } as F;
    const sourceOf = (name: keyof F & string): FlagSource =>
      name in overrides ? 'override' : name in remote.values ? 'remote' : 'default';
    return {
      flags,
      defaults,
      remote: remote.values,
      overrides,
      sourceOf,
      status: remote.status,
      error: remote.error,
      setOverride,
      clearOverride,
      clearOverrides: removeStoredOverrides,
      refresh,
    };
  }, [defaults, remote, overrides, setOverride, clearOverride, removeStoredOverrides, refresh]);

  return <FlagContext value={value}>{children}</FlagContext>;
}
