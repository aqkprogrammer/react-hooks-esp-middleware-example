import { fetchJson } from '../../../hooks';

export type Role = 'editor' | 'viewer';

export interface User {
  id: number;
  name: string;
  role: Role;
}

export interface Note {
  id: number;
  text: string;
  author: string;
}

function isUser(value: unknown): value is User {
  if (typeof value !== 'object' || value === null) return false;
  const user = value as Partial<User>;
  return (
    typeof user.id === 'number' &&
    typeof user.name === 'string' &&
    (user.role === 'editor' || user.role === 'viewer')
  );
}

async function parseUser(response: Response): Promise<User> {
  const body: unknown = await response.json();
  if (!isUser(body)) throw new TypeError('Unexpected /api/me response');
  return body;
}

/** POST /api/login → an access token. The password "wrong" answers 401. */
export async function requestToken(
  username: string,
  password: string,
  signal?: AbortSignal,
): Promise<string> {
  const body = await fetchJson<{ token?: unknown }>('/api/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password }),
    signal,
  });
  if (typeof body.token !== 'string') throw new TypeError('Login response has no token');
  return body.token;
}

/** GET /api/me — the server's view of who the token belongs to (and their role). */
export function fetchMe(token: string, signal?: AbortSignal): Promise<User> {
  return fetchJson('/api/me', {
    headers: { authorization: `Bearer ${token}` },
    signal,
    parse: parseUser,
  });
}

export const NOTES_URL = '/api/scenarios/auth/notes';
export const EXPIRE_URL = '/api/scenarios/auth/expire';
