export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
}

/**
 * Fixed latency per profile (sent as `?delay=`), so the race is
 * reproducible: request a slow profile, then a fast one, and the slow
 * response arrives last.
 */
export const PROFILES: ReadonlyArray<{ id: number; label: string; delayMs: number }> = [
  { id: 1, label: 'Ada', delayMs: 1200 },
  { id: 2, label: 'Grace', delayMs: 200 },
  { id: 3, label: 'Alan', delayMs: 600 },
  { id: 4, label: 'Katherine', delayMs: 100 },
  { id: 5, label: 'Edsger', delayMs: 900 },
  { id: 404, label: 'Missing user', delayMs: 300 },
];

export function profileUrl(userId: number): string {
  const delayMs = PROFILES.find((profile) => profile.id === userId)?.delayMs ?? 300;
  return `/api/users/${userId}?delay=${delayMs}`;
}

export function isUser(value: unknown): value is User {
  if (typeof value !== 'object' || value === null) return false;
  const user = value as Record<string, unknown>;
  return (
    typeof user.id === 'number' &&
    typeof user.name === 'string' &&
    typeof user.email === 'string' &&
    (user.role === 'admin' || user.role === 'editor' || user.role === 'viewer')
  );
}
