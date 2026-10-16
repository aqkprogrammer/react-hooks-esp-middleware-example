import type { ReactNode } from 'react';
import type { Role } from './authApi';
import { useAuth } from './authContext';

/** Renders `children` only for a signed-in user. UI gating — not security. */
export function RequireAuth({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const { session } = useAuth();
  return session ? children : fallback;
}

/**
 * Renders `children` only for users whose role is `requires`. This hides controls the
 * user cannot use; the **server** still checks the role on every request.
 */
export function RequireRole({
  requires,
  children,
  fallback,
}: {
  requires: Role;
  children: ReactNode;
  fallback: ReactNode;
}) {
  const { session } = useAuth();
  return session?.user.role === requires ? children : fallback;
}
