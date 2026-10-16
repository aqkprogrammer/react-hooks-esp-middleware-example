import { createContext, use, type Dispatch } from 'react';
import type { TodosAction, TodosState } from './todosReducer';

/**
 * Two contexts instead of one `{ state, dispatch }` object: components that
 * only dispatch subscribe to `TodosDispatchContext`, whose value (the stable
 * `dispatch`) never changes, so they do not re-render when the list changes.
 */
export const TodosStateContext = createContext<TodosState | null>(null);
export const TodosDispatchContext = createContext<Dispatch<TodosAction> | null>(null);

export function useTodos(): TodosState {
  const state = use(TodosStateContext);
  if (state === null) throw new Error('useTodos must be used inside <TodosProvider>.');
  return state;
}

export function useTodosDispatch(): Dispatch<TodosAction> {
  const dispatch = use(TodosDispatchContext);
  if (dispatch === null) throw new Error('useTodosDispatch must be used inside <TodosProvider>.');
  return dispatch;
}
