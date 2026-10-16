import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';

export interface UseListActions<T> {
  /** Replace the whole list (value or updater). */
  set: Dispatch<SetStateAction<readonly T[]>>;
  /** Append items to the end. */
  push: (...items: T[]) => void;
  /** Insert before `index`; the index is clamped to `[0, length]`. */
  insertAt: (index: number, item: T) => void;
  /** Replace the item at `index` with `updater(item, index)`. Out-of-range indices are ignored. */
  updateAt: (index: number, updater: (item: T, index: number) => T) => void;
  /** Remove the item at `index`. Out-of-range indices are ignored. */
  removeAt: (index: number) => void;
  /** Move the item at `from` so that it ends up at `to`. Out-of-range indices are ignored. */
  move: (from: number, to: number) => void;
  /** Keep only the items matching `predicate`. */
  filter: (predicate: (item: T, index: number) => boolean) => void;
  clear: () => void;
  /** Back to the initial list from the first render. */
  reset: () => void;
}

export type UseListReturn<T> = readonly [list: readonly T[], actions: UseListActions<T>];

const isIndex = (index: number, length: number) =>
  Number.isInteger(index) && index >= 0 && index < length;

/**
 * An array in state with immutable helpers.
 *
 * Every change produces a **new array** (React compares state with
 * `Object.is`, so mutating in place would not re-render). When an operation
 * changes nothing — removing an out-of-range index, filtering out nothing,
 * clearing an empty list, updating to the same item — the *previous* array is
 * returned and React skips the re-render.
 *
 * All actions use functional updates (several calls in one event compose)
 * and are stable for the component's lifetime. Negative indices are not
 * supported (they are ignored, not counted from the end).
 */
export function useList<T>(
  initialList: readonly T[] | (() => readonly T[]) = [],
): UseListReturn<T> {
  const [initial] = useState(initialList);
  const [list, setList] = useState<readonly T[]>(initial);

  const actions = useMemo<UseListActions<T>>(
    () => ({
      set: setList,
      push: (...items) =>
        setList((previous) => (items.length ? [...previous, ...items] : previous)),
      insertAt: (index, item) =>
        setList((previous) => {
          const at = Math.min(Math.max(Math.trunc(index) || 0, 0), previous.length);
          return [...previous.slice(0, at), item, ...previous.slice(at)];
        }),
      updateAt: (index, updater) =>
        setList((previous) => {
          if (!isIndex(index, previous.length)) return previous;
          const current = previous[index] as T;
          const next = updater(current, index);
          if (Object.is(next, current)) return previous;
          return previous.with(index, next);
        }),
      removeAt: (index) =>
        setList((previous) =>
          isIndex(index, previous.length) ? previous.toSpliced(index, 1) : previous,
        ),
      move: (from, to) =>
        setList((previous) => {
          if (from === to || !isIndex(from, previous.length) || !isIndex(to, previous.length)) {
            return previous;
          }
          const next = previous.toSpliced(from, 1);
          return next.toSpliced(to, 0, previous[from] as T);
        }),
      filter: (predicate) =>
        setList((previous) => {
          const next = previous.filter(predicate);
          return next.length === previous.length ? previous : next;
        }),
      clear: () => setList((previous) => (previous.length ? [] : previous)),
      reset: () => setList(initial),
    }),
    [initial],
  );

  return [list, actions] as const;
}
