/**
 * Atom *definitions* are module-level configs; their *values* live in a
 * store. The demo mounts its own `<Provider>`, so each mount (and each test)
 * gets fresh values.
 */
import { atom } from 'jotai';
import { unwrap } from 'jotai/utils';
import type { User } from '../../../mocks/data';

export type RoleFilter = 'all' | User['role'];

/** Request outcomes are values, so a failure renders a message instead of needing an error boundary. */
export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

async function getJson<T>(url: string, signal: AbortSignal): Promise<Result<T>> {
  try {
    const response = await fetch(url, { signal });
    if (!response.ok) return { ok: false, error: `Request failed (${response.status})` };
    return { ok: true, data: (await response.json()) as T };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// ---- Primitive atoms: like useState, but shareable without prop drilling.
export const searchAtom = atom('');
export const roleAtom = atom<RoleFilter>('all');
export const selectedUserIdAtom = atom<number | null>(null);

// ---- Async atom: fetched once per store, when first read.
export const usersAtom = atom((_get, { signal }) => getJson<User[]>('/api/users', signal));

/**
 * `unwrap` turns the async atom into a sync one (`null` while pending), so
 * the filtered list below can update on every keystroke without suspending.
 */
const loadedUsersAtom = unwrap(usersAtom, (previous) => previous ?? null);

// ---- Derived atoms: recomputed only when an atom they read changes.
export const usersStatusAtom = atom((get) => {
  const result = get(loadedUsersAtom);
  if (result === null) return { state: 'loading' } as const;
  return result.ok
    ? ({ state: 'ready' } as const)
    : ({ state: 'error', error: result.error } as const);
});

export const visibleUsersAtom = atom((get) => {
  const result = get(loadedUsersAtom);
  if (!result?.ok) return [];
  const query = get(searchAtom).trim().toLowerCase();
  const role = get(roleAtom);
  return result.data.filter(
    (user) =>
      (role === 'all' || user.role === role) && (!query || user.name.toLowerCase().includes(query)),
  );
});

/**
 * Async derived atom: every new selection returns a new promise, which
 * suspends the nearest `<Suspense>` until the profile arrives. The `signal`
 * aborts the previous request when the selection changes. With nothing
 * selected it returns `null` synchronously, so it does not suspend at all.
 */
export const selectedUserAtom = atom((get, { signal }) => {
  const id = get(selectedUserIdAtom);
  return id === null ? null : getJson<User>(`/api/users/${id}?delay=300`, signal);
});

// ---- Write-only atom: an "action" that updates several atoms at once.
export const clearFiltersAtom = atom(null, (_get, set) => {
  set(searchAtom, '');
  set(roleAtom, 'all');
});
