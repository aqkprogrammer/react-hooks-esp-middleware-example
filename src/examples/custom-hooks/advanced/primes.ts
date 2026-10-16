/**
 * Shared between the main thread and `primes.worker.ts`: the message protocol
 * (so both sides agree on the types) and the computation itself.
 */

export interface PrimesRequest {
  id: number;
  limit: number;
}

export type PrimesResponse =
  | { type: 'progress'; id: number; percent: number }
  | { type: 'result'; id: number; limit: number; count: number; largest: number; ms: number };

/** Deliberately CPU-heavy trial division (not a sieve) so the work is noticeable. */
export function countPrimes(
  limit: number,
  onProgress?: (percent: number) => void,
): { count: number; largest: number } {
  let count = 0;
  let largest = 0;
  const step = Math.max(1, Math.floor(limit / 20));
  for (let candidate = 2; candidate <= limit; candidate += 1) {
    let isPrime = true;
    for (let divisor = 2; divisor * divisor <= candidate; divisor += 1) {
      if (candidate % divisor === 0) {
        isPrime = false;
        break;
      }
    }
    if (isPrime) {
      count += 1;
      largest = candidate;
    }
    if (onProgress && candidate % step === 0) onProgress(Math.round((candidate / limit) * 100));
  }
  return { count, largest };
}

/** Runs a request and reports through `post` — used by the worker and by test fakes. */
export function handlePrimesRequest(
  request: PrimesRequest,
  post: (response: PrimesResponse) => void,
): void {
  const started = performance.now();
  const { count, largest } = countPrimes(request.limit, (percent) =>
    post({ type: 'progress', id: request.id, percent }),
  );
  post({
    type: 'result',
    id: request.id,
    limit: request.limit,
    count,
    largest,
    ms: Math.round(performance.now() - started),
  });
}
