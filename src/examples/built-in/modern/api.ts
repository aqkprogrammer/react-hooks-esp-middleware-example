/**
 * Small typed client for the mocked endpoints used by the Modern React demos.
 * Every function returns a Promise and throws an `HttpError` with the server's
 * message on non-2xx responses, which is what Actions and error boundaries
 * expect.
 */
import type { Todo } from '../../../mocks/data';
import type { ModernProfile } from '../../../mocks/extra/modernHandlers';

export type { ModernProfile, Todo };

export class HttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof body === 'object' &&
      body !== null &&
      'message' in body &&
      typeof body.message === 'string'
        ? body.message
        : `Request failed with status ${response.status}`;
    throw new HttpError(response.status, message);
  }
  return body as T;
}

export function fetchProfile(id: number): Promise<ModernProfile> {
  return requestJson<ModernProfile>(`/api/modern/profiles/${id}`);
}

// A module-level cache keyed by id: the *same* Promise object is returned for
// the same id, which is what `use(promise)` requires on re-render.
const profileCache = new Map<number, Promise<ModernProfile>>();

/** Returns a cached Promise for the profile; a rejected promise is evicted so it can be retried. */
export function getProfile(id: number): Promise<ModernProfile> {
  let promise = profileCache.get(id);
  if (!promise) {
    promise = fetchProfile(id);
    promise.catch(() => profileCache.delete(id));
    profileCache.set(id, promise);
  }
  return promise;
}

/** Test helper and "refresh" button: forget every cached profile. */
export function clearProfileCache(): void {
  profileCache.clear();
}

export interface WidgetData {
  title: string;
  lines: string[];
}

export function fetchWidget(name: string, fail = false): Promise<WidgetData> {
  return requestJson<WidgetData>(`/api/modern/widgets/${name}${fail ? '?fail=1' : ''}`);
}

export function subscribeToNewsletter(email: string): Promise<{ email: string; message: string }> {
  return requestJson('/api/modern/newsletter', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function saveDisplayName(name: string): Promise<{ name: string }> {
  return requestJson('/api/modern/display-name', {
    method: 'PUT',
    body: JSON.stringify({ name }),
  });
}

export function fetchTodos(signal?: AbortSignal): Promise<Todo[]> {
  return requestJson<Todo[]>('/api/todos', { signal });
}

export function createTodo(title: string): Promise<Todo> {
  return requestJson<Todo>('/api/todos', { method: 'POST', body: JSON.stringify({ title }) });
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
