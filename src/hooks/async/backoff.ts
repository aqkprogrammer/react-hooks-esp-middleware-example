export interface BackoffOptions {
  /** Delay before the first retry, in ms. Default `500`. */
  baseDelayMs?: number;
  /** Upper bound for any single delay, in ms. Default `10_000`. */
  maxDelayMs?: number;
  /** Growth factor per attempt. Default `2` (500, 1000, 2000, …). */
  factor?: number;
  /**
   * - `'full'` (default): a random delay in `[0, exponential]` — spreads
   *   clients out so they do not all retry at the same instant.
   * - `'equal'`: half fixed, half random — never retries almost immediately.
   * - `'none'`: the exact exponential delay (deterministic).
   */
  jitter?: 'full' | 'equal' | 'none';
}

/**
 * Exponential backoff with jitter: the delay before retry number `retry`
 * (1-based). Pure — pass `random` to make it deterministic in tests.
 *
 * See AWS Architecture Blog, "Exponential Backoff And Jitter".
 */
export function computeBackoff(
  retry: number,
  options: BackoffOptions = {},
  random: () => number = Math.random,
): number {
  const { baseDelayMs = 500, maxDelayMs = 10_000, factor = 2, jitter = 'full' } = options;
  const exponential = Math.min(maxDelayMs, baseDelayMs * factor ** Math.max(0, retry - 1));
  if (jitter === 'none') return exponential;
  if (jitter === 'equal') return Math.round(exponential / 2 + random() * (exponential / 2));
  return Math.round(random() * exponential);
}

/** Resolves after `ms`, or rejects with the signal's reason as soon as it aborts. */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
