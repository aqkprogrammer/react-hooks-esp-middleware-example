import { useMemo, useReducer, useState, type SetStateAction } from 'react';

export interface UseUndoRedoOptions {
  /** Maximum number of undo steps kept; the oldest are dropped. Default: unlimited. */
  limit?: number;
  /**
   * Consecutive `set` calls with the same `coalesceKey` that are at most this
   * many milliseconds apart are merged into one undo step. Default `1000`.
   */
  coalesceWindowMs?: number;
}

export interface UndoRedoSetOptions {
  /**
   * Merge this change with the previous one when both share this key and
   * happen within `coalesceWindowMs` — e.g. `'typing'` so a burst of
   * keystrokes is undone as one step. Omit for a discrete history entry.
   */
  coalesceKey?: string;
}

export interface UseUndoRedoReturn<T> {
  present: T;
  /** Older states, oldest first. */
  past: readonly T[];
  /** States that `redo` would restore, next first. */
  future: readonly T[];
  canUndo: boolean;
  canRedo: boolean;
  /** Record a new present state (value or updater); clears the redo stack. */
  set: (next: SetStateAction<T>, options?: UndoRedoSetOptions) => void;
  undo: () => void;
  redo: () => void;
  /** Clear the history and start again from `present` (default: the initial value). */
  reset: (present?: T) => void;
}

/** The reducer state. Exported for documentation and testing. */
export interface UndoRedoState<T> {
  past: readonly T[];
  present: T;
  future: readonly T[];
  /** The coalescing group of the last change, if any. */
  group: { key: string; at: number } | null;
}

export type UndoRedoAction<T> =
  | {
      type: 'set';
      next: SetStateAction<T>;
      coalesceKey: string | undefined;
      at: number;
      limit: number;
      windowMs: number;
    }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'reset'; present: T };

const trim = <T>(items: readonly T[], limit: number) =>
  items.length > limit ? items.slice(items.length - limit) : items;

/**
 * Pure reducer behind `useUndoRedo`. Everything impure (the timestamp used
 * for coalescing, the options) travels in the action, so the reducer can be
 * replayed safely (React calls reducers twice in Strict Mode).
 */
export function undoRedoReducer<T>(
  state: UndoRedoState<T>,
  action: UndoRedoAction<T>,
): UndoRedoState<T> {
  switch (action.type) {
    case 'set': {
      const next =
        typeof action.next === 'function'
          ? (action.next as (previous: T) => T)(state.present)
          : action.next;
      if (Object.is(next, state.present)) return state;
      const { coalesceKey, at, limit, windowMs } = action;
      const group = coalesceKey === undefined ? null : { key: coalesceKey, at };
      if (
        group &&
        state.group &&
        state.group.key === group.key &&
        at - state.group.at <= windowMs &&
        state.past.length > 0
      ) {
        // Same burst: replace the present without adding an undo step.
        return { past: state.past, present: next, future: [], group };
      }
      return {
        past: trim([...state.past, state.present], limit),
        present: next,
        future: [],
        group,
      };
    }
    case 'undo': {
      if (state.past.length === 0) return state;
      return {
        past: state.past.slice(0, -1),
        present: state.past[state.past.length - 1] as T,
        future: [state.present, ...state.future],
        group: null,
      };
    }
    case 'redo': {
      if (state.future.length === 0) return state;
      const [next, ...rest] = state.future;
      return {
        past: [...state.past, state.present],
        present: next as T,
        future: rest,
        group: null,
      };
    }
    case 'reset':
      return { past: [], present: action.present, future: [], group: null };
  }
}

/**
 * State with undo/redo: `past` / `present` / `future` stacks managed by a
 * pure reducer.
 *
 * - `set` pushes the old present onto `past` and clears `future` (a new
 *   branch discards the redo stack, like every editor).
 * - Setting a value that is `Object.is`-equal to `present` does nothing.
 * - `limit` bounds memory by dropping the oldest steps.
 * - `coalesceKey` merges bursts (typing, dragging) into a single step.
 * - All actions are stable while the options stay the same.
 *
 * Store immutable snapshots: if you mutate an object that is also in `past`,
 * undo will "restore" the mutated object.
 */
export function useUndoRedo<T>(
  initialPresent: T,
  options: UseUndoRedoOptions = {},
): UseUndoRedoReturn<T> {
  const { limit = Infinity, coalesceWindowMs = 1000 } = options;
  const [initial] = useState(() => initialPresent);
  const [state, dispatch] = useReducer(undoRedoReducer<T>, initial, (present) => ({
    past: [],
    present,
    future: [],
    group: null,
  }));

  const actions = useMemo(
    () => ({
      set: (next: SetStateAction<T>, setOptions: UndoRedoSetOptions = {}) =>
        dispatch({
          type: 'set',
          next,
          coalesceKey: setOptions.coalesceKey,
          at: Date.now(),
          limit: Math.max(0, limit),
          windowMs: coalesceWindowMs,
        }),
      undo: () => dispatch({ type: 'undo' }),
      redo: () => dispatch({ type: 'redo' }),
      reset: (...args: [present?: T]) =>
        dispatch({ type: 'reset', present: args.length ? (args[0] as T) : initial }),
    }),
    [limit, coalesceWindowMs, initial],
  );

  return {
    present: state.present,
    past: state.past,
    future: state.future,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    ...actions,
  };
}
