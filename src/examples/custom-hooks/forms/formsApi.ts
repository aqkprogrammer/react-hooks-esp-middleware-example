/**
 * Small fetch helpers and validators shared by the form demos. The endpoints
 * are served by MSW (src/mocks/extra/forms.ts).
 */

/** An HTTP error with the server's message and, for field errors, the field name. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly field?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function postJson<T>(url: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  const data = (await response.json().catch(() => ({}))) as {
    message?: string;
    field?: string;
  };
  if (!response.ok) {
    throw new ApiError(
      data.message ?? `Request failed (${response.status})`,
      response.status,
      data.field,
    );
  }
  return data as T;
}

/** Async validator: resolves an error message when the username is taken. */
export async function checkUsernameAvailable(
  username: string,
  signal: AbortSignal,
): Promise<string | undefined> {
  const response = await fetch(`/api/forms/username?username=${encodeURIComponent(username)}`, {
    signal,
  });
  if (!response.ok) throw new Error(`Could not check availability (${response.status})`);
  const data = (await response.json()) as { available: boolean };
  return data.available ? undefined : `“${username}” is already taken`;
}

export const required =
  (label: string) =>
  (value: string): string | undefined =>
    value.trim() ? undefined : `${label} is required`;

export const usernameFormat = (value: string): string | undefined =>
  /^[a-z0-9_]{3,20}$/i.test(value) ? undefined : 'Use 3–20 letters, digits or underscores';

export const emailFormat = (value: string): string | undefined =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? undefined : 'Enter an email like name@example.com';

export const minLength =
  (length: number) =>
  (value: string): string | undefined =>
    value.length >= length ? undefined : `Use at least ${length} characters`;
