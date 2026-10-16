import { useDebouncedCallback, type DebouncedFunction } from './useDebouncedCallback';

export interface UseThrottledCallbackOptions {
  /** Invoke on the first call. Default `true`. */
  leading?: boolean;
  /** Invoke once more at the end of the interval with the latest arguments. Default `true`. */
  trailing?: boolean;
}

/**
 * Returns a throttled version of `callback` that runs at most once every
 * `intervalMs` while calls keep coming.
 *
 * Throttling is debouncing with `maxWait === wait`: this hook is a thin
 * layer over `useDebouncedCallback` and shares its guarantees (stable
 * identity, latest callback, `cancel`/`flush`/`isPending`, no calls after
 * unmount).
 */
export function useThrottledCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  intervalMs: number,
  options: UseThrottledCallbackOptions = {},
): DebouncedFunction<Args> {
  const { leading = true, trailing = true } = options;
  return useDebouncedCallback(callback, intervalMs, {
    leading,
    trailing,
    maxWait: intervalMs,
  });
}
