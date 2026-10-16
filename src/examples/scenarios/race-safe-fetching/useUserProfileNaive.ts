import { useEffect, useState } from 'react';
import { profileUrl, type User } from './users';

/**
 * ⚠️ BUGGY ON PURPOSE — shown side by side with `useUserProfile`.
 * This is the fetch-in-an-effect most codebases start with. Do not copy it.
 */
export function useUserProfileNaive(userId: number): { user: User | null; error: string | null } {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // BUG 1: no AbortController — the old request keeps running after
    //        `userId` changes (and after unmount).
    // BUG 2: no "ignore" flag in a cleanup — whichever response arrives
    //        *last* wins, even if it belongs to an older `userId`.
    fetch(profileUrl(userId))
      // BUG 3: no `response.ok` check and no validation — a 404 error body
      //        is stored as if it were a user.
      .then((response) => response.json() as Promise<User>)
      .then((data) => {
        setUser(data);
        setError(null);
      })
      .catch((caught: unknown) => setError(String(caught)));
  }, [userId]);

  return { user, error };
}
