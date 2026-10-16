/**
 * Mock endpoints for the "Forms & input" demos. Stateless on purpose, so
 * tests never depend on each other.
 *
 * - GET  /api/forms/username?username=… → `{ username, available }`.
 *   Latency is *inverted* (shorter names respond slower) so typing "ad" then
 *   "ada" makes the stale "ad" answer arrive last — the async-validation race.
 * - POST /api/forms/signup  → 201 `{ id, username }`; 409 for a taken username
 *   — including "racer", which the availability check reports as free (someone
 *   else "registers" it between check and submit) — 422 for missing fields,
 *   500 when the email contains "fail".
 * - POST /api/forms/feedback → 201 after ~1.2 s; 500 when the message contains "fail".
 *
 * Every endpoint accepts `?delay=ms` to override the latency.
 */
import { delay, http, HttpResponse } from 'msw';

export const TAKEN_USERNAMES: readonly string[] = [
  'admin',
  'root',
  'ada',
  'grace',
  'linus',
  'taken',
];

const isTaken = (username: string) => TAKEN_USERNAMES.includes(username.trim().toLowerCase());

function latency(url: URL, fallback: number): number {
  const raw = url.searchParams.get('delay');
  const parsed = raw === null ? Number.NaN : Number(raw);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(10_000, parsed)) : fallback;
}

let nextId = 1;

export const handlers = [
  http.get('/api/forms/username', async ({ request }) => {
    const url = new URL(request.url);
    const username = (url.searchParams.get('username') ?? '').trim();
    await delay(latency(url, Math.max(60, 700 - username.length * 100)));
    if (!username) return HttpResponse.json({ message: 'username is required' }, { status: 400 });
    return HttpResponse.json({ username, available: !isTaken(username) });
  }),

  http.post('/api/forms/signup', async ({ request }) => {
    const url = new URL(request.url);
    const body = (await request.json()) as { username?: unknown; email?: unknown };
    await delay(latency(url, 500));
    const username = typeof body.username === 'string' ? body.username.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    if (!username || !email) {
      return HttpResponse.json({ message: 'Username and email are required' }, { status: 422 });
    }
    if (email.toLowerCase().includes('fail')) {
      return HttpResponse.json({ message: 'Sign-up service unavailable' }, { status: 500 });
    }
    if (isTaken(username) || username.toLowerCase() === 'racer') {
      return HttpResponse.json(
        { message: `"${username}" was registered a moment ago`, field: 'username' },
        { status: 409 },
      );
    }
    return HttpResponse.json({ id: nextId++, username }, { status: 201 });
  }),

  http.post('/api/forms/feedback', async ({ request }) => {
    const url = new URL(request.url);
    const body = (await request.json()) as { message?: unknown };
    await delay(latency(url, 1200));
    const message = typeof body.message === 'string' ? body.message : '';
    if (message.toLowerCase().includes('fail')) {
      return HttpResponse.json({ message: 'Could not save your feedback' }, { status: 500 });
    }
    return HttpResponse.json(
      { id: nextId++, receivedAt: new Date().toISOString() },
      { status: 201 },
    );
  }),
];
