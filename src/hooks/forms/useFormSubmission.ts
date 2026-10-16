import { useCallback, useEffect, useRef, useState } from 'react';
import { toError } from '../internal/env';
import { useLatest } from '../state/useLatest';

export type SubmissionStatus = 'idle' | 'submitting' | 'success' | 'error';

/** What `submit()` resolved with. It never rejects. */
export type SubmissionOutcome<R> =
  | { status: 'success'; data: R }
  | { status: 'error'; error: Error }
  /** A submission was already in flight, so this call did nothing. */
  | { status: 'skipped' }
  /** `abort()`, `reset()` or unmount cancelled it; state was not updated. */
  | { status: 'aborted' };

export interface UseFormSubmissionOptions<R> {
  onSuccess?: (data: R) => void;
  onError?: (error: Error) => void;
}

export interface UseFormSubmissionResult<A, R> {
  status: SubmissionStatus;
  isSubmitting: boolean;
  /** Result of the last successful submission. */
  data: R | undefined;
  /** Error of the last failed submission. */
  error: Error | undefined;
  /** Starts a submission unless one is already in flight. */
  submit: (args: A) => Promise<SubmissionOutcome<R>>;
  /** Cancels the in-flight submission (aborting its signal) and returns to `idle`. */
  abort: () => void;
  /** Like `abort()`, and also clears `data` and `error`. */
  reset: () => void;
}

interface SubmissionState<R> {
  status: SubmissionStatus;
  data: R | undefined;
  error: Error | undefined;
}

/**
 * The lifecycle of an async form submission:
 * `idle → submitting → success | error`.
 *
 * - **No double submits**: a ref (not state) guards re-entry, so even two
 *   clicks in the same frame — before React re-renders a disabled button —
 *   start only one request.
 * - **Cancellation**: `submitFn` receives an `AbortSignal` that is aborted by
 *   `abort()`, `reset()` and unmount; results that arrive afterwards are
 *   ignored, so callbacks never run for an unmounted form.
 * - `submitFn`, `onSuccess` and `onError` may change between renders; the
 *   latest ones are used. `submit`, `abort` and `reset` are stable.
 */
export function useFormSubmission<A = void, R = unknown>(
  submitFn: (args: A, signal: AbortSignal) => Promise<R>,
  options: UseFormSubmissionOptions<R> = {},
): UseFormSubmissionResult<A, R> {
  const [state, setState] = useState<SubmissionState<R>>({
    status: 'idle',
    data: undefined,
    error: undefined,
  });
  const submitRef = useLatest(submitFn);
  const optionsRef = useLatest(options);
  const inFlightRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      inFlightRef.current?.abort();
      inFlightRef.current = null;
    },
    [],
  );

  const submit = useCallback(
    async (args: A): Promise<SubmissionOutcome<R>> => {
      if (inFlightRef.current) return { status: 'skipped' };
      const controller = new AbortController();
      inFlightRef.current = controller;
      setState((previous) => ({ ...previous, status: 'submitting', error: undefined }));
      try {
        const data = await submitRef.current(args, controller.signal);
        if (controller.signal.aborted) return { status: 'aborted' };
        setState({ status: 'success', data, error: undefined });
        optionsRef.current.onSuccess?.(data);
        return { status: 'success', data };
      } catch (thrown) {
        // Only *our* abort means "cancelled"; an AbortError from elsewhere is a failure.
        if (controller.signal.aborted) return { status: 'aborted' };
        const error = toError(thrown);
        setState((previous) => ({ ...previous, status: 'error', error }));
        optionsRef.current.onError?.(error);
        return { status: 'error', error };
      } finally {
        if (inFlightRef.current === controller) inFlightRef.current = null;
      }
    },
    [submitRef, optionsRef],
  );

  const abort = useCallback(() => {
    inFlightRef.current?.abort();
    inFlightRef.current = null;
    setState((previous) =>
      previous.status === 'submitting' ? { ...previous, status: 'idle' } : previous,
    );
  }, []);

  const reset = useCallback(() => {
    inFlightRef.current?.abort();
    inFlightRef.current = null;
    setState({ status: 'idle', data: undefined, error: undefined });
  }, []);

  return {
    status: state.status,
    isSubmitting: state.status === 'submitting',
    data: state.data,
    error: state.error,
    submit,
    abort,
    reset,
  };
}
