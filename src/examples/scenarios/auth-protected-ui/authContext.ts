import { createContext, use } from 'react';
import type { User } from './authApi';

export interface Session {
  /** Bearer token — kept in memory only (never in Web Storage). */
  token: string;
  /** From GET /api/me, i.e. what the server says, not what the client assumed. */
  user: User;
}

export interface AuthContextValue {
  session: Session | null;
  /** Why the user was signed out (e.g. an expired session), for the sign-in screen. */
  notice: string | null;
  signIn: (username: string, password: string, signal?: AbortSignal) => Promise<void>;
  signOut: () => void;
  /**
   * `fetchJson` with `Authorization: Bearer <token>`. A 401 for the
   * *current* token ends the session ("Your session expired").
   */
  authFetch: <T>(url: string, init?: RequestInit) => Promise<T>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = use(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
