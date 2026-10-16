import { useCallback, useSyncExternalStore } from 'react';
import type { ReducerStore } from './createReducerStore';

/**
 * Subscribes a component to a *slice* of a {@link ReducerStore} created
 * outside React (`createReducerStore`). The component re-renders only when
 * the selected value changes (`Object.is`), not on every dispatch.
 *
 * The selector must return a primitive or a reference that already exists in
 * the state (`state => state.items`), never a freshly built object or array
 * (`state => ({ a: state.a })`): `useSyncExternalStore` would see a new
 * snapshot on every read and re-render forever. Derive objects from the
 * selected values with `useMemo` instead.
 *
 * SSR: the server snapshot is the store's current state, so render the same
 * store on the client for hydration to match.
 */
export function useStoreSelector<S, A, Selected>(
  store: Pick<ReducerStore<S, A>, 'getState' | 'subscribe'>,
  selector: (state: S) => Selected,
): Selected {
  const getSnapshot = useCallback(() => selector(store.getState()), [store, selector]);
  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}
