import { useReducer, type ReactNode } from 'react';
import { TodosDispatchContext, TodosStateContext } from './todosContext';
import { initialTodos, todosReducer } from './todosReducer';

/** Owns the reducer and provides state and dispatch through separate contexts. */
export function TodosProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(todosReducer, initialTodos);
  return (
    <TodosStateContext value={state}>
      <TodosDispatchContext value={dispatch}>{children}</TodosDispatchContext>
    </TodosStateContext>
  );
}
