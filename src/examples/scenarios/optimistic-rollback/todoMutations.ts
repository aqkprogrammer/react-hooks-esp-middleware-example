import { fetchJson } from '../../../hooks';

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

/** Every change the list can make, as one discriminated union. */
export type TodoMutation =
  | { kind: 'add'; tempId: string; title: string }
  | { kind: 'toggle'; id: string; title: string; completed: boolean; fail: boolean }
  | { kind: 'delete'; id: string; title: string; fail: boolean };

/** Pure: what the list looks like if the server accepts `mutation`. */
export function applyOptimistic(todos: Todo[], mutation: TodoMutation): Todo[] {
  switch (mutation.kind) {
    case 'add':
      return [...todos, { id: mutation.tempId, title: mutation.title, completed: false }];
    case 'toggle':
      return todos.map((todo) =>
        todo.id === mutation.id ? { ...todo, completed: mutation.completed } : todo,
      );
    case 'delete':
      return todos.filter((todo) => todo.id !== mutation.id);
  }
}

/** Pure: folds the server's answer into the confirmed list (server ids win). */
export function applyResult(todos: Todo[], result: Todo | null, mutation: TodoMutation): Todo[] {
  if (mutation.kind === 'delete' || result === null) return applyOptimistic(todos, mutation);
  if (mutation.kind === 'add') return [...todos, result];
  return todos.map((todo) => (todo.id === result.id ? result : todo));
}

const jsonHeaders = (fail: boolean): HeadersInit => ({
  'content-type': 'application/json',
  ...(fail ? { 'x-fail': '1' } : {}),
});

/** Sends one mutation. Rejects (→ rollback) on any non-2xx response. */
export async function sendTodoMutation(
  mutation: TodoMutation,
  signal: AbortSignal,
): Promise<Todo | null> {
  switch (mutation.kind) {
    case 'add':
      return fetchJson<Todo>('/api/todos', {
        method: 'POST',
        headers: jsonHeaders(false),
        body: JSON.stringify({ title: mutation.title }),
        signal,
      });
    case 'toggle':
      return fetchJson<Todo>(`/api/todos/${encodeURIComponent(mutation.id)}`, {
        method: 'PATCH',
        headers: jsonHeaders(mutation.fail),
        body: JSON.stringify({ completed: mutation.completed }),
        signal,
      });
    case 'delete':
      await fetchJson<unknown>(`/api/todos/${encodeURIComponent(mutation.id)}`, {
        method: 'DELETE',
        headers: jsonHeaders(mutation.fail),
        signal,
      });
      return null;
  }
}

export function describeMutation(mutation: TodoMutation): string {
  switch (mutation.kind) {
    case 'add':
      return `add “${mutation.title}”`;
    case 'toggle':
      return `mark “${mutation.title}” as ${mutation.completed ? 'done' : 'not done'}`;
    case 'delete':
      return `delete “${mutation.title}”`;
  }
}
