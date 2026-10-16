/**
 * Mock endpoints for the "Interaction & accessibility", "Forms" and
 * "Authentication" scenarios (src/examples/scenarios/*).
 *
 * Wizard (multi-step form):
 * - POST /api/scenarios/wizard/accounts → 201 `{ id, email, displayName }`;
 *   409 `{ message, field: 'email' }` when the email starts with "taken@";
 *   422 when a required field is missing; 500 when the display name
 *   contains "fail".
 *
 * Auth (auth-protected UI). The core `/api/login` and `/api/me` handlers
 * (../handlers.ts) stay the source of truth; the handlers below only add:
 * - a **viewer** account: `POST /api/login` with username "viewer" (any
 *   password except "wrong") signs in with role `viewer`; `GET /api/me` with
 *   its token reports `viewer`. Every other login falls through unchanged.
 * - server-side session revocation: `POST /api/scenarios/auth/expire`
 *   revokes the caller's token; afterwards `GET /api/me` and the notes
 *   endpoints answer 401 until the user signs in again.
 * - a protected resource: `GET /api/scenarios/auth/notes` (any signed-in
 *   user) and `POST /api/scenarios/auth/notes` (editors only → 403 for
 *   viewers). The *server* enforces the role — the UI only mirrors it.
 *
 * Every endpoint accepts `?delay=ms`.
 */
import { delay, http, HttpResponse, type RequestHandler } from 'msw';

const TOKEN_PREFIX = 'demo-token-';
const VIEWER_TOKEN = `${TOKEN_PREFIX}viewer`;

export interface ScenarioNote {
  id: number;
  text: string;
  author: string;
}

const INITIAL_NOTES: readonly ScenarioNote[] = [
  { id: 1, text: 'Rotate the staging API keys on Friday.', author: 'grace' },
  { id: 2, text: 'Release notes for 2.4 are in review.', author: 'linus' },
];

const state = {
  revoked: new Set<string>(),
  notes: INITIAL_NOTES.map((note) => ({ ...note })),
  nextNoteId: 3,
  nextAccountId: 1,
};

/** Restores this module's in-memory state. Call from tests that change it. */
export function resetScenariosInteractionMocks(): void {
  state.revoked.clear();
  state.notes = INITIAL_NOTES.map((note) => ({ ...note }));
  state.nextNoteId = 3;
  state.nextAccountId = 1;
}

function latency(request: Request, fallback: number): number {
  const raw = new URL(request.url).searchParams.get('delay');
  const parsed = raw === null ? Number.NaN : Number(raw);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(10_000, parsed)) : fallback;
}

function bearer(request: Request): string {
  return (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
}

type Session = { name: string; role: 'editor' | 'viewer' };

/** Resolves the caller's session, or returns the 401 response to send. */
function authenticate(request: Request): Session | Response {
  const token = bearer(request);
  if (!token.startsWith(TOKEN_PREFIX)) {
    return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  if (state.revoked.has(token)) {
    return HttpResponse.json({ message: 'Session expired' }, { status: 401 });
  }
  return {
    name: token.slice(TOKEN_PREFIX.length),
    role: token === VIEWER_TOKEN ? 'viewer' : 'editor',
  };
}

export const handlers: RequestHandler[] = [
  http.post('/api/scenarios/wizard/accounts', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    await delay(latency(request, 600));
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : '';
    if (!email || !displayName) {
      return HttpResponse.json({ message: 'Email and display name are required' }, { status: 422 });
    }
    if (email.toLowerCase().startsWith('taken@')) {
      return HttpResponse.json(
        { message: `${email} is already registered`, field: 'email' },
        { status: 409 },
      );
    }
    if (displayName.toLowerCase().includes('fail')) {
      return HttpResponse.json({ message: 'The account service is unavailable' }, { status: 500 });
    }
    return HttpResponse.json({ id: state.nextAccountId++, email, displayName }, { status: 201 });
  }),

  /** Signing in starts a fresh session: un-revoke the token, then add the viewer account. */
  http.post('/api/login', async ({ request }) => {
    const body = (await request.clone().json()) as { username?: unknown; password?: unknown };
    const username = typeof body.username === 'string' ? body.username : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (username && password && password !== 'wrong') {
      state.revoked.delete(`${TOKEN_PREFIX}${username}`);
    }
    if (username.toLowerCase() !== 'viewer' || !password || password === 'wrong') {
      return undefined;
    }
    await delay(latency(request, 400));
    return HttpResponse.json({
      token: VIEWER_TOKEN,
      user: { id: 98, name: 'viewer', role: 'viewer' },
    });
  }),

  /** Only answers for revoked or viewer tokens; everything else falls through to the core handler. */
  http.get('/api/me', async ({ request }) => {
    const token = bearer(request);
    if (!state.revoked.has(token) && token !== VIEWER_TOKEN) return undefined;
    await delay(latency(request, 150));
    const session = authenticate(request);
    if (session instanceof Response) return session;
    return HttpResponse.json({ id: 98, name: session.name, role: session.role });
  }),

  http.post('/api/scenarios/auth/expire', async ({ request }) => {
    const session = authenticate(request);
    if (session instanceof Response) return session;
    state.revoked.add(bearer(request));
    await delay(latency(request, 50));
    return new HttpResponse(null, { status: 204 });
  }),

  http.get('/api/scenarios/auth/notes', async ({ request }) => {
    await delay(latency(request, 200));
    const session = authenticate(request);
    if (session instanceof Response) return session;
    return HttpResponse.json(state.notes);
  }),

  http.post('/api/scenarios/auth/notes', async ({ request }) => {
    const body = (await request.json()) as { text?: unknown };
    await delay(latency(request, 300));
    const session = authenticate(request);
    if (session instanceof Response) return session;
    if (session.role !== 'editor') {
      return HttpResponse.json(
        { message: `Role "${session.role}" may not create notes` },
        { status: 403 },
      );
    }
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (!text) return HttpResponse.json({ message: 'Text is required' }, { status: 422 });
    const note: ScenarioNote = { id: state.nextNoteId++, text, author: session.name };
    state.notes = [...state.notes, note];
    return HttpResponse.json(note, { status: 201 });
  }),
];
