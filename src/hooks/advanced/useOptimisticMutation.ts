import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { useLatest } from '../state/useLatest';
import { toError } from '../internal/env';

export interface UseOptimisticMutationOptions<TState, TVariables, TResult> {
  /** The confirmed (server-acknowledged) state. Read once; use `setConfirmed` to replace it later. */
  initialState: TState | (() => TState);
  /** Performs the mutation. Reject to roll back. Respect `signal` (aborted on unmount). */
  mutationFn: (variables: TVariables, signal: AbortSignal) => Promise<TResult>;
  /** Pure: how the state looks if the mutation succeeds. Applied immediately. */
  applyOptimistic: (state: TState, variables: TVariables) => TState;
  /**
   * Pure: folds the server's answer into the confirmed state. Defaults to
   * `applyOptimistic(state, variables)`; provide it to use server-generated
   * ids, timestamps or normalised values.
   */
  applyResult?: (state: TState, result: TResult, variables: TVariables) => TState;
  onSuccess?: (result: TResult, variables: TVariables) => void;
  /** Called after the optimistic change was rolled back. */
  onError?: (error: Error, variables: TVariables) => void;
}

export interface OptimisticPendingMutation<TVariables> {
  id: number;
  variables: TVariables;
}

export type OptimisticMutationOutcome<TResult> =
  { ok: true; result: TResult } | { ok: false; error: Error };

export interface OptimisticMutation<TState, TVariables, TResult> {
  /** What to render: the confirmed state with every pending mutation applied on top. */
  state: TState;
  /** Server-acknowledged state only. */
  confirmedState: TState;
  /** Mutations in flight, oldest first. */
  pending: ReadonlyArray<OptimisticPendingMutation<TVariables>>;
  isPending: boolean;
  /** The most recent failure (cleared by the next successful mutation or `dismissError`). */
  error: Error | null;
  /**
   * Applies the optimistic update now and runs `mutationFn`. Never rejects:
   * resolves with `{ ok, result | error }` (or `{ ok: false }` with an
   * `AbortError` if the component unmounted).
   */
  mutate: (variables: TVariables) => Promise<OptimisticMutationOutcome<TResult>>;
  /** Replaces the confirmed state, e.g. after refetching. Pending mutations are re-applied on top. */
  setConfirmed: (next: TState | ((previous: TState) => TState)) => void;
  dismissError: () => void;
}

interface State<TState, TVariables> {
  confirmed: TState;
  pending: ReadonlyArray<OptimisticPendingMutation<TVariables>>;
  error: Error | null;
}

type Action<TState, TVariables> =
  | { type: 'start'; mutation: OptimisticPendingMutation<TVariables> }
  | { type: 'success'; id: number; apply: (state: TState) => TState }
  | { type: 'failure'; id: number; error: Error }
  | { type: 'set-confirmed'; next: TState | ((previous: TState) => TState) }
  | { type: 'dismiss-error' };

function reducer<TState, TVariables>(
  state: State<TState, TVariables>,
  action: Action<TState, TVariables>,
): State<TState, TVariables> {
  switch (action.type) {
    case 'start':
      return { ...state, pending: [...state.pending, action.mutation] };
    case 'success':
      return {
        confirmed: action.apply(state.confirmed),
        pending: state.pending.filter((mutation) => mutation.id !== action.id),
        error: null,
      };
    case 'failure':
      // Rolling back = forgetting the pending entry. Other in-flight
      // mutations stay applied, unlike restoring a snapshot.
      return {
        ...state,
        pending: state.pending.filter((mutation) => mutation.id !== action.id),
        error: action.error,
      };
    case 'set-confirmed':
      return {
        ...state,
        confirmed:
          typeof action.next === 'function'
            ? (action.next as (previous: TState) => TState)(state.confirmed)
            : action.next,
      };
    case 'dismiss-error':
      return state.error ? { ...state, error: null } : state;
  }
}

/**
 * Optimistic updates with automatic rollback, for state you own outside a
 * form action or transition.
 *
 * The rendered state is *derived*: `confirmed` + every pending mutation
 * replayed with `applyOptimistic`. Success folds the result into `confirmed`;
 * failure drops the pending entry. Because nothing is restored from a
 * snapshot, concurrent mutations that finish out of order never clobber each
 * other — the same model React's `useOptimistic` uses internally, and safer
 * than "snapshot in `onMutate`, restore in `onError`".
 *
 * Use React's `useOptimistic` when the mutation runs inside an Action
 * (`<form action>`, `startTransition`); use TanStack Query's `onMutate` /
 * `onError` / `invalidateQueries` when the data is server cache.
 */
export function useOptimisticMutation<TState, TVariables, TResult>(
  options: UseOptimisticMutationOptions<TState, TVariables, TResult>,
): OptimisticMutation<TState, TVariables, TResult> {
  const optionsRef = useLatest(options);
  const [state, dispatch] = useReducer(
    reducer<TState, TVariables>,
    options.initialState,
    (initial): State<TState, TVariables> => ({
      confirmed: typeof initial === 'function' ? (initial as () => TState)() : initial,
      pending: [],
      error: null,
    }),
  );
  const nextIdRef = useRef(0);
  const controllersRef = useRef(new Set<AbortController>());

  useEffect(() => {
    const controllers = controllersRef.current;
    return () => {
      for (const controller of controllers) controller.abort();
      controllers.clear();
    };
  }, []);

  const mutate = useCallback(
    async (variables: TVariables): Promise<OptimisticMutationOutcome<TResult>> => {
      nextIdRef.current += 1;
      const id = nextIdRef.current;
      const controller = new AbortController();
      controllersRef.current.add(controller);
      dispatch({ type: 'start', mutation: { id, variables } });
      try {
        const result = await optionsRef.current.mutationFn(variables, controller.signal);
        if (controller.signal.aborted) throw new DOMException('Unmounted', 'AbortError');
        const { applyResult, applyOptimistic } = optionsRef.current;
        dispatch({
          type: 'success',
          id,
          apply: (confirmed) =>
            applyResult
              ? applyResult(confirmed, result, variables)
              : applyOptimistic(confirmed, variables),
        });
        optionsRef.current.onSuccess?.(result, variables);
        return { ok: true, result };
      } catch (reason) {
        const error = toError(reason);
        // Aborted because the component unmounted: there is no state left to roll back.
        if (controller.signal.aborted) return { ok: false, error };
        dispatch({ type: 'failure', id, error });
        optionsRef.current.onError?.(error, variables);
        return { ok: false, error };
      } finally {
        controllersRef.current.delete(controller);
      }
    },
    [optionsRef],
  );

  const setConfirmed = useCallback(
    (next: TState | ((previous: TState) => TState)) => dispatch({ type: 'set-confirmed', next }),
    [],
  );
  const dismissError = useCallback(() => dispatch({ type: 'dismiss-error' }), []);

  const { applyOptimistic } = options;
  const optimisticState = useMemo(
    () =>
      state.pending.reduce(
        (current, mutation) => applyOptimistic(current, mutation.variables),
        state.confirmed,
      ),
    [state.pending, state.confirmed, applyOptimistic],
  );

  return {
    state: optimisticState,
    confirmedState: state.confirmed,
    pending: state.pending,
    isPending: state.pending.length > 0,
    error: state.error,
    mutate,
    setConfirmed,
    dismissError,
  };
}
