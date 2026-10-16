/**
 * Typed errors shared by the async hooks. Exported publicly so consumers can
 * narrow with `instanceof` (e.g. `if (error instanceof HttpError && error.status === 404)`).
 */

/** A response arrived but its status was not 2xx. */
export class HttpError extends Error {
  override readonly name = 'HttpError';
  readonly status: number;
  readonly statusText: string;
  readonly url: string;
  /** The parsed response body (JSON when possible, otherwise text), if it could be read. */
  readonly body: unknown;

  constructor(response: { status: number; statusText: string; url: string }, body: unknown) {
    const detail =
      typeof body === 'object' && body !== null && 'message' in body
        ? String((body as { message: unknown }).message)
        : response.statusText;
    super(`HTTP ${response.status}${detail ? `: ${detail}` : ''}`);
    this.status = response.status;
    this.statusText = response.statusText;
    this.url = response.url;
    this.body = body;
  }
}

/** The request took longer than the configured timeout and was aborted. */
export class TimeoutError extends Error {
  override readonly name = 'TimeoutError';
  readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs} ms`);
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Default retry policy: network failures (`TypeError` from `fetch`),
 * timeouts, `408`, `429` and `5xx` responses are transient; other `4xx`
 * responses and aborts are not.
 */
export function isTransientError(error: unknown): boolean {
  if (error instanceof HttpError) {
    return error.status === 408 || error.status === 429 || error.status >= 500;
  }
  if (error instanceof TimeoutError) return true;
  return error instanceof TypeError;
}
