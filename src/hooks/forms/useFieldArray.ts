import { useCallback, useMemo, useState } from 'react';

/** One row: a stable `key` for React plus the item value. */
export interface FieldArrayItem<T> {
  /**
   * Generated once when the item is added and kept through moves and
   * removals of other rows. Use it as the React `key`; it is not meant for
   * DOM ids (use `useId` for those).
   */
  readonly key: string;
  readonly value: T;
}

export interface UseFieldArrayResult<T> {
  fields: ReadonlyArray<FieldArrayItem<T>>;
  /** Just the values, e.g. to submit. */
  values: T[];
  append: (value: T) => void;
  prepend: (value: T) => void;
  /** Insert before `index` (clamped to the list bounds). */
  insert: (index: number, value: T) => void;
  /** Remove the item at `index`; out-of-range indices are ignored. */
  remove: (index: number) => void;
  /** Move the item at `from` to `to`; out-of-range indices are ignored. */
  move: (from: number, to: number) => void;
  /** Replace the value at `index`, keeping its key. */
  update: (index: number, value: T | ((previous: T) => T)) => void;
  /** Replace every item; all rows get new keys. */
  replace: (values: readonly T[]) => void;
  /** Back to the initial items (with new keys). */
  reset: () => void;
}

let keyCounter = 0;
function createItem<T>(value: T): FieldArrayItem<T> {
  keyCounter += 1;
  return { key: `item-${keyCounter.toString(36)}`, value };
}

/**
 * A dynamic list of form rows (phone numbers, line items, attendees) with
 * stable generated keys.
 *
 * Using the array **index** as React `key` breaks as soon as rows are removed
 * or reordered: React reuses the wrong component instance, so uncontrolled
 * inputs, focus and local state jump to a different row. Here every item
 * gets a key when it is created and keeps it until it is removed.
 *
 * All operations are functional state updates, so several calls in one event
 * handler compose correctly.
 */
export function useFieldArray<T>(
  initialValues: readonly T[] | (() => readonly T[]),
): UseFieldArrayResult<T> {
  const [initial] = useState<readonly T[]>(initialValues);
  const [fields, setFields] = useState<ReadonlyArray<FieldArrayItem<T>>>(() =>
    initial.map(createItem),
  );

  const append = useCallback((value: T) => {
    const item = createItem(value);
    setFields((previous) => [...previous, item]);
  }, []);

  const prepend = useCallback((value: T) => {
    const item = createItem(value);
    setFields((previous) => [item, ...previous]);
  }, []);

  const insert = useCallback((index: number, value: T) => {
    const item = createItem(value);
    setFields((previous) => {
      const at = Math.max(0, Math.min(previous.length, index));
      return [...previous.slice(0, at), item, ...previous.slice(at)];
    });
  }, []);

  const remove = useCallback((index: number) => {
    setFields((previous) =>
      index < 0 || index >= previous.length
        ? previous
        : previous.filter((_item, position) => position !== index),
    );
  }, []);

  const move = useCallback((from: number, to: number) => {
    setFields((previous) => {
      const inRange = (index: number) => index >= 0 && index < previous.length;
      if (from === to || !inRange(from) || !inRange(to)) return previous;
      const next = [...previous];
      const [item] = next.splice(from, 1);
      if (item) next.splice(to, 0, item);
      return next;
    });
  }, []);

  const update = useCallback((index: number, value: T | ((previous: T) => T)) => {
    setFields((previous) => {
      const current = previous[index];
      if (!current) return previous;
      const nextValue =
        typeof value === 'function' ? (value as (previous: T) => T)(current.value) : value;
      if (Object.is(nextValue, current.value)) return previous;
      const next = [...previous];
      next[index] = { key: current.key, value: nextValue };
      return next;
    });
  }, []);

  const replace = useCallback((values: readonly T[]) => {
    const items = values.map(createItem);
    setFields(items);
  }, []);

  const reset = useCallback(() => {
    const items = initial.map(createItem);
    setFields(items);
  }, [initial]);

  const values = useMemo(() => fields.map((item) => item.value), [fields]);

  return { fields, values, append, prepend, insert, remove, move, update, replace, reset };
}
