import { useFetch, type UseAsyncResult } from '../../../hooks';
import { isUser, profileUrl, type User } from './users';

async function parseUser(response: Response): Promise<User> {
  const body: unknown = await response.json();
  if (!isUser(body)) throw new TypeError('The server sent something that is not a user');
  return body;
}

/**
 * The race-safe version: a thin, reusable hook over `useFetch`.
 *
 * - Changing `userId` aborts the previous request (AbortController).
 * - A response for an older `userId` can never be rendered, even if the
 *   server ignores the abort: `useAsync` only accepts the latest run.
 * - Unmounting aborts the request in flight.
 * - Non-2xx responses become `HttpError`s and the body is validated, so a
 *   404 page is never mistaken for a user.
 *
 * Pass `null` to fetch nothing.
 */
export function useUserProfile(userId: number | null): UseAsyncResult<User> {
  return useFetch<User>(userId === null ? null : profileUrl(userId), {
    parse: parseUser,
    timeoutMs: 10_000,
  });
}
