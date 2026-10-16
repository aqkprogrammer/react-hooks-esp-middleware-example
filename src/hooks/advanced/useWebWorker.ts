import { useCallback, useEffect, useRef, useState } from 'react';
import { isBrowser, toError } from '../internal/env';
import { useLatest } from '../state/useLatest';
import { useBrowserSupport } from '../device/support';

/**
 * A worker script URL, or a factory. With Vite (and webpack 5) use the
 * factory form so the bundler can find and compile the worker module:
 *
 * ```ts
 * () => new Worker(new URL('./primes.worker.ts', import.meta.url), { type: 'module' })
 * ```
 */
export type WorkerSource = string | URL | (() => Worker);

export interface UseWebWorkerOptions<TOut> {
  /** Passed to `new Worker(url, options)` for string/URL sources, e.g. `{ type: 'module' }`. */
  workerOptions?: WorkerOptions;
  /** Called for every message from the worker (in addition to updating `lastMessage`). */
  onMessage?: (data: TOut) => void;
  /** Called for script errors, uncaught exceptions in the worker and undeserialisable messages. */
  onError?: (error: Error) => void;
}

export interface WebWorkerControls<TIn, TOut> {
  /** `Worker` exists (false on the server). */
  isSupported: boolean;
  /** A worker is alive (spawned and not terminated). */
  isRunning: boolean;
  /** The most recent message from the worker. */
  lastMessage: TOut | undefined;
  error: Error | null;
  /**
   * Sends a message, spawning the worker on first use. Returns `false` when
   * workers are unsupported or the worker could not be created.
   */
  postMessage: (message: TIn, transfer?: Transferable[]) => boolean;
  /** Stops the worker immediately (in-flight work is lost). The next `postMessage` spawns a new one. */
  terminate: () => void;
}

interface State<TOut> {
  /** Source key of the live worker, so a changed source reads as "not running". */
  runningKey: string | null;
  lastMessage: TOut | undefined;
  error: Error | null;
}

const detect = () => isBrowser && typeof Worker === 'function';

/**
 * Runs code in a Web Worker with typed messages.
 *
 * - The worker is spawned **lazily** on the first `postMessage` (so unused
 *   workers cost nothing and Strict Mode does not spawn two) and terminated
 *   on unmount or when the source changes.
 * - Messages from a terminated worker are ignored.
 * - `TIn`/`TOut` type the protocol; nothing is validated at runtime, so keep
 *   the worker and the component in sync (share the types in one module).
 *
 * Messages are copied with the structured clone algorithm: functions, DOM
 * nodes and class prototypes do not survive. Pass large `ArrayBuffer`s in
 * `transfer` to move them instead of copying.
 */
export function useWebWorker<TIn, TOut>(
  source: WorkerSource,
  options: UseWebWorkerOptions<TOut> = {},
): WebWorkerControls<TIn, TOut> {
  const isSupported = useBrowserSupport(detect);
  const [state, setState] = useState<State<TOut>>({
    runningKey: null,
    lastMessage: undefined,
    error: null,
  });
  const sourceRef = useLatest(source);
  const optionsRef = useLatest(options);
  const workerRef = useRef<Worker | null>(null);
  // Factories are usually inline arrows, so their identity is ignored.
  const sourceKey = typeof source === 'function' ? 'factory' : String(source);

  const terminate = useCallback(() => {
    const current = workerRef.current;
    workerRef.current = null;
    if (!current) return;
    current.terminate();
    setState((previous) => ({ ...previous, runningKey: null }));
  }, []);

  const fail = useCallback(
    (error: Error) => {
      setState((previous) => ({ ...previous, error }));
      optionsRef.current.onError?.(error);
    },
    [optionsRef],
  );

  const spawn = useCallback((): Worker | null => {
    if (workerRef.current) return workerRef.current;
    if (!detect()) return null;
    const current = sourceRef.current;
    const key = typeof current === 'function' ? 'factory' : String(current);
    let worker: Worker;
    try {
      worker =
        typeof current === 'function'
          ? current()
          : new Worker(current, optionsRef.current.workerOptions);
    } catch (error) {
      fail(toError(error));
      return null;
    }
    const isCurrent = () => workerRef.current === worker;
    worker.addEventListener('message', (event: MessageEvent<TOut>) => {
      if (!isCurrent()) return;
      setState((previous) => ({ ...previous, lastMessage: event.data }));
      optionsRef.current.onMessage?.(event.data);
    });
    worker.addEventListener('error', (event: ErrorEvent) => {
      if (!isCurrent()) return;
      // Stop the browser from also logging it as an uncaught error.
      event.preventDefault();
      fail(new Error(event.message || 'The worker failed to load or threw an error'));
    });
    worker.addEventListener('messageerror', () => {
      if (isCurrent()) fail(new Error('A message from the worker could not be deserialised'));
    });
    workerRef.current = worker;
    setState((previous) => ({ ...previous, runningKey: key, error: null }));
    return worker;
  }, [sourceRef, optionsRef, fail]);

  const postMessage = useCallback(
    (message: TIn, transfer: Transferable[] = []): boolean => {
      const worker = spawn();
      if (!worker) return false;
      try {
        worker.postMessage(message, transfer);
        return true;
      } catch (error) {
        // DataCloneError: the message contains something that cannot be cloned.
        fail(toError(error));
        return false;
      }
    },
    [spawn, fail],
  );

  // Terminate on unmount, and when the source changes.
  useEffect(() => () => terminate(), [sourceKey, terminate]);

  return {
    isSupported,
    isRunning: state.runningKey !== null && state.runningKey === sourceKey,
    lastMessage: state.lastMessage,
    error: state.error,
    postMessage,
    terminate,
  };
}
