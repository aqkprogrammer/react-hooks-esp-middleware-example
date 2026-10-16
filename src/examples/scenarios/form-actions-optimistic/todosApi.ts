import { fetchJson, HttpError } from '../../../hooks';

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

export function fetchTodos(signal: AbortSignal): Promise<Todo[]> {
  return fetchJson<Todo[]>('/api/todos', { signal, timeoutMs: 8000 });
}

/** POST /api/todos — a title containing "fail" answers 500. */
export function createTodo(title: string): Promise<Todo> {
  return fetchJson<Todo>('/api/todos', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title }),
    timeoutMs: 8000,
  });
}

export function errorMessage(error: unknown): string {
  if (error instanceof HttpError) {
    const body = error.body as { message?: unknown } | undefined;
    return typeof body?.message === 'string' ? body.message : `HTTP ${error.status}`;
  }
  return error instanceof Error ? error.message : String(error);
}
