import { useContext } from 'react';
import type { FeatureFlagDefinition, FeatureFlagsValue, FlagValues } from './featureFlags';

/**
 * Reads one flag declared with `defineFeatureFlags`. The name is checked at
 * compile time and the return type follows the default's type:
 *
 * ```tsx
 * const newCheckout = useFeatureFlag(appFlags, 'newCheckout'); // boolean
 * const mode = useFeatureFlag(appFlags, 'searchMode');          // string
 * ```
 *
 * Outside a `<FeatureFlagProvider>` (and therefore in isolated tests and
 * storybook-style previews) it returns the default value.
 */
export function useFeatureFlag<F extends FlagValues, K extends keyof F & string>(
  definition: FeatureFlagDefinition<F>,
  name: K,
): F[K] {
  const value = useContext(definition.context);
  return (value ? value.flags[name] : definition.defaults[name]) as F[K];
}

/**
 * Full access to a flag set: effective values, their sources, the remote
 * loading status and the local override controls — for admin/debug panels.
 * Throws when used outside the matching `<FeatureFlagProvider>`.
 */
export function useFeatureFlags<F extends FlagValues>(
  definition: FeatureFlagDefinition<F>,
): FeatureFlagsValue<F> {
  const value = useContext(definition.context);
  if (!value) {
    throw new Error('useFeatureFlags must be used inside <FeatureFlagProvider definition={…}>.');
  }
  return value;
}
