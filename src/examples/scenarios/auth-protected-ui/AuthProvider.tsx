import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { fetchJson, HttpError, useAnnouncer } from '../../../hooks';
import { fetchMe, requestToken } from './authApi';
import { AuthContext, type AuthContextValue, type Session } from './authContext';

export const EXPIRED_NOTICE = 'Your session expired. Sign in again to continue.';

/**
 * Holds the session **in memory**: a reload signs the user out, and no
 * script can read the token from storage. See the scenario's notes for the
 * production setup (HttpOnly refresh cookie + short-lived access token).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Synchronous mirror for authFetch, which may run between renders.
  const sessionRef = useRef<Session | null>(null);
  const { announce } = useAnnouncer();

  const replaceSession = useCallback((next: Session | null) => {
    sessionRef.current = next;
    setSession(next);
  }, []);

  const signIn = useCallback(
    async (username: string, password: string, signal?: AbortSignal) => {
      const token = await requestToken(username, password, signal);
      const user = await fetchMe(token, signal);
      setNotice(null);
      replaceSession({ token, user });
    },
    [replaceSession],
  );

  const signOut = useCallback(() => {
    setNotice(null);
    replaceSession(null);
  }, [replaceSession]);

  const authFetch = useCallback(
    async <T,>(url: string, init: RequestInit = {}): Promise<T> => {
      const current = sessionRef.current;
      if (!current) throw new Error('Not signed in');
      const headers = new Headers(init.headers);
      headers.set('authorization', `Bearer ${current.token}`);
      try {
        return await fetchJson<T>(url, { ...init, headers });
      } catch (error) {
        // Only the token that failed is expired: a late 401 from an older
        // session must not sign out a user who has signed in again since.
        if (
          error instanceof HttpError &&
          error.status === 401 &&
          sessionRef.current?.token === current.token
        ) {
          setNotice(EXPIRED_NOTICE);
          replaceSession(null);
          announce(EXPIRED_NOTICE, { politeness: 'assertive' });
        }
        throw error;
      }
    },
    [replaceSession, announce],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ session, notice, signIn, signOut, authFetch }),
    [session, notice, signIn, signOut, authFetch],
  );
  return <AuthContext value={value}>{children}</AuthContext>;
}
