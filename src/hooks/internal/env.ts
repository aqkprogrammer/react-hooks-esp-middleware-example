/** True when running in a browser-like environment with a DOM. */
export const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

export const noop = (): void => {};

/** Normalises unknown thrown values into `Error` instances. */
export function toError(value: unknown): Error {
  if (value instanceof Error) return value;
  if (typeof value === 'string') return new Error(value);
  try {
    return new Error(JSON.stringify(value));
  } catch {
    return new Error(String(value));
  }
}

/** True for `AbortError`s raised by fetch/AbortSignal-aware APIs. */
export function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  );
}
