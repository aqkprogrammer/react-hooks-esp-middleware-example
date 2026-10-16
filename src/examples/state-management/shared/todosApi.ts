/**
 * Plain `fetch` helpers for the mocked `/api/todos` endpoints, shared by the
 * Redux Toolkit, TanStack Query and SWR demos so each demo shows only its
 * library's state handling.
 *
 * The mock server (src/mocks/handlers.ts) rejects titles containing "fail"
 * with a 500, and PATCH requests with the `x-fail: 1` header.
 */
import type { Todo } from '../../../mocks/data';

export type { Todo };

/** An HTTP error carrying the server's `message`. */
export class ApiError extends Error {
  override name = 'ApiError';
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function parse<T>(response: Response): Promise<T> {
  if (response.ok) return (await response.json()) as T;
  let message = `Request failed with status ${response.status}`;
  try {
    const body: unknown = await response.json();
    if (typeof body === 'object' && body !== null && 'message' in body) {
      message = String((body as { message: unknown }).message);
    }
  } catch {
    // Non-JSON error body: keep the generic message.
  }
  throw new ApiError(response.status, message);
}

export async function fetchTodos(signal?: AbortSignal): Promise<Todo[]> {
  return parse<Todo[]>(await fetch('/api/todos', { signal }));
}

export async function createTodo(title: string, signal?: AbortSignal): Promise<Todo> {
  const response = await fetch('/api/todos', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title }),
    signal,
  });
  return parse<Todo>(response);
}

export async function updateTodo(
  id: string,
  patch: Partial<Pick<Todo, 'title' | 'completed'>>,
  options: { simulateFailure?: boolean } = {},
): Promise<Todo> {
  const response = await fetch(`/api/todos/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      ...(options.simulateFailure ? { 'x-fail': '1' } : {}),
    },
    body: JSON.stringify(patch),
  });
  return parse<Todo>(response);
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
