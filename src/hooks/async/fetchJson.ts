import { HttpError, TimeoutError } from './errors';

export interface FetchJsonOptions<T> extends RequestInit {
  /** Abort the request (including reading the body) after this many ms and throw a `TimeoutError`. */
  timeoutMs?: number;
  /**
   * Turns a successful `Response` into data. Defaults to JSON (an empty body
   * yields `undefined`). The default is a *type assertion*, not validation —
   * pass a parser that checks the shape when the data comes from outside your control.
   */
  parse?: (response: Response) => Promise<T>;
}

async function defaultParse<T>(response: Response): Promise<T> {
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

async function readErrorBody(response: Response): Promise<unknown> {
  try {
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } catch {
    return undefined;
  }
}

/**
 * `fetch` with the three things every data hook needs: non-2xx responses
 * reject with a typed {@link HttpError}, an optional timeout rejects with a
 * {@link TimeoutError}, and the caller's `signal` still cancels the request
 * (rejecting with the browser's `AbortError`).
 *
 * A plain function, not a hook — usable from `useAsync`, `useAsyncFn`,
 * `useRetry`, event handlers or tests.
 */
export async function fetchJson<T = unknown>(
  input: string | URL,
  options: FetchJsonOptions<T> = {},
): Promise<T> {
  const { timeoutMs, parse = defaultParse<T>, signal, ...init } = options;
  const controller = new AbortController();
  const forwardAbort = () => controller.abort(signal?.reason);
  if (signal?.aborted) forwardAbort();
  else signal?.addEventListener('abort', forwardAbort, { once: true });

  let timedOut = false;
  const timer =
    timeoutMs === undefined
      ? undefined
      : setTimeout(() => {
          timedOut = true;
          controller.abort(new TimeoutError(timeoutMs));
        }, timeoutMs);

  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    if (!response.ok) throw new HttpError(response, await readErrorBody(response));
    return await parse(response);
  } catch (error) {
    // Different runtimes surface `abort(reason)` differently; normalise.
    if (timedOut && timeoutMs !== undefined) throw new TimeoutError(timeoutMs);
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', forwardAbort);
  }
}
