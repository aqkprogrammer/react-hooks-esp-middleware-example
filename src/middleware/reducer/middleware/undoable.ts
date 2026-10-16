import type { Reducer } from '../types';

export const UNDO = '@@undoable/UNDO';
export const REDO = '@@undoable/REDO';
export const CLEAR_HISTORY = '@@undoable/CLEAR_HISTORY';

export type UndoableAction =
  { type: typeof UNDO } | { type: typeof REDO } | { type: typeof CLEAR_HISTORY };

export const undo = (): UndoableAction => ({ type: UNDO });
export const redo = (): UndoableAction => ({ type: REDO });
export const clearHistory = (): UndoableAction => ({ type: CLEAR_HISTORY });

/** `present` is the live state; `past` is oldest-first, `future` is next-first. */
export interface UndoableState<S> {
  past: readonly S[];
  present: S;
  future: readonly S[];
}

export interface UndoableOptions<S, A> {
  /** Maximum number of undo steps kept (oldest are dropped). Default 50. */
  limit?: number;
  /**
   * Return `false` for actions that should change `present` *without* creating
   * an undo step (selection, hover, transient UI state). Default: record all.
   */
  shouldRecord?: (action: A, nextPresent: S, previousPresent: S) => boolean;
}

/** Wraps an initial state for an `undoable` reducer. */
export function createUndoableState<S>(present: S): UndoableState<S> {
  return { past: [], present, future: [] };
}

export function isUndoableAction(action: unknown): action is UndoableAction {
  if (typeof action !== 'object' || action === null) return false;
  const type: unknown = (action as { type?: unknown }).type;
  return type === UNDO || type === REDO || type === CLEAR_HISTORY;
}

/**
 * A **reducer enhancer**: takes a reducer and returns a new reducer whose
 * state is `{ past, present, future }` and which also understands `UNDO`,
 * `REDO` and `CLEAR_HISTORY`.
 *
 * Enhancer vs middleware: middleware wrap `dispatch` and decide *whether and
 * when* actions reach the reducer (side effects live there). An enhancer
 * wraps the *reducer* and changes *what the state is*; it stays pure, so it
 * works with plain `useReducer`, `useReducerWithMiddleware` or Redux alike.
 *
 * - Actions that leave `present` unchanged (`Object.is`) create no history.
 * - Any new recorded change clears `future` (you cannot redo after editing).
 * - Unrecorded changes (see `shouldRecord`) update `present` in place.
 */
export function undoable<S, A>(
  reducer: Reducer<S, A>,
  options: UndoableOptions<S, A> = {},
): Reducer<UndoableState<S>, A | UndoableAction> {
  const { limit = 50, shouldRecord } = options;
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError('undoable: `limit` must be a positive integer.');
  }

  return (state, action) => {
    if (isUndoableAction(action)) {
      switch (action.type) {
        case UNDO: {
          if (state.past.length === 0) return state;
          return {
            past: state.past.slice(0, -1),
            // Non-empty, so the last element exists (S itself may include undefined).
            present: state.past[state.past.length - 1] as S,
            future: [state.present, ...state.future],
          };
        }
        case REDO: {
          if (state.future.length === 0) return state;
          return {
            past: [...state.past, state.present].slice(-limit),
            present: state.future[0] as S,
            future: state.future.slice(1),
          };
        }
        case CLEAR_HISTORY:
          return state.past.length === 0 && state.future.length === 0
            ? state
            : createUndoableState(state.present);
      }
    }

    // Not an undo action, so it belongs to the wrapped reducer.
    const userAction = action as A;
    const present = reducer(state.present, userAction);
    if (Object.is(present, state.present)) return state;
    if (shouldRecord && !shouldRecord(userAction, present, state.present)) {
      return { ...state, present };
    }
    return {
      past: [...state.past, state.present].slice(-limit),
      present,
      future: [],
    };
  };
}
