import { useState, useSyncExternalStore } from 'react';

export interface UseQueueReturn<T> {
  /** Snapshot of the queue, front first. A new array after every change. */
  items: readonly T[];
  size: number;
  /** The front item (next to be dequeued), or `undefined` when empty. */
  first: T | undefined;
  /** The most recently enqueued item, or `undefined` when empty. */
  last: T | undefined;
  /** Adds items to the back. */
  enqueue: (...items: T[]) => void;
  /** Removes and **returns** the front item synchronously (`undefined` when empty). */
  dequeue: () => T | undefined;
  /** Reads the current front item without removing it — up to date even before a re-render. */
  peek: () => T | undefined;
  clear: () => void;
}

interface QueueStore<T> {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => readonly T[];
  enqueue: (...items: T[]) => void;
  dequeue: () => T | undefined;
  peek: () => T | undefined;
  clear: () => void;
}

function createQueueStore<T>(initial: readonly T[]): QueueStore<T> {
  let items = initial;
  const listeners = new Set<() => void>();
  const commit = (next: readonly T[]) => {
    items = next;
    listeners.forEach((listener) => listener());
  };
  return {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => items,
    enqueue: (...values) => {
      if (values.length) commit([...items, ...values]);
    },
    dequeue: () => {
      if (items.length === 0) return undefined;
      const [head, ...rest] = items;
      commit(rest);
      return head;
    },
    peek: () => items[0],
    clear: () => {
      if (items.length) commit([]);
    },
  };
}

/**
 * A FIFO queue owned by one component.
 *
 * Why not plain `useState`? `dequeue()` must *return* the removed item. With
 * `useState` the next state is computed later, inside an updater, so two
 * `dequeue()` calls in the same event would both see the same front item. This
 * hook keeps the queue in a tiny per-component store read through
 * `useSyncExternalStore`: changes are applied synchronously (so `dequeue` and
 * `peek` are always accurate) and React re-renders with the new snapshot.
 *
 * Call the actions from event handlers or effects, never during render.
 * Updates are synchronous (they cannot be marked as transitions).
 */
export function useQueue<T>(initialItems: readonly T[] = []): UseQueueReturn<T> {
  const [store] = useState(() => createQueueStore(initialItems));
  const items = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return {
    items,
    size: items.length,
    first: items[0],
    last: items[items.length - 1],
    enqueue: store.enqueue,
    dequeue: store.dequeue,
    peek: store.peek,
    clear: store.clear,
  };
}
