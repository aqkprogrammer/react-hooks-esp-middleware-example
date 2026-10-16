/**
 * Endpoints for the "Modern React (19+)" demos (`use`, Actions, forms,
 * Suspense). Stateless on purpose: every rule is derived from the request,
 * so tests never depend on order or on resetting a database.
 */
import { delay, http, HttpResponse } from 'msw';

export interface ModernProfile {
  id: number;
  name: string;
  role: string;
  bio: string;
}

const profiles: readonly ModernProfile[] = [
  { id: 1, name: 'Ada Lovelace', role: 'Analyst', bio: 'Wrote the first published algorithm.' },
  { id: 2, name: 'Grace Hopper', role: 'Admiral', bio: 'Built the first compiler toolchain.' },
  { id: 3, name: 'Alan Turing', role: 'Mathematician', bio: 'Formalised computation.' },
];

const widgetData: Record<string, { title: string; lines: string[] }> = {
  weather: { title: 'Weather', lines: ['Sunny, 21°C', 'Wind 8 km/h'] },
  stats: { title: 'Stats', lines: ['1,204 active users', '0.3% error rate'] },
  news: { title: 'News', lines: ['React 19.3 released', 'View Transitions are stable'] },
};

function readDelay(url: URL, fallback: number): number {
  const raw = url.searchParams.get('delay');
  const parsed = raw === null ? fallback : Number(raw);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(10_000, parsed)) : fallback;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const handlers = [
  /** Profiles 1–3 exist; anything else is a 404. */
  http.get('/api/modern/profiles/:id', async ({ params, request }) => {
    await delay(readDelay(new URL(request.url), 600));
    const profile = profiles.find((item) => item.id === Number(params.id));
    return profile
      ? HttpResponse.json(profile)
      : HttpResponse.json({ message: `Profile ${String(params.id)} not found` }, { status: 404 });
  }),

  /** Invalid e-mail → 422; any address containing "taken" → 409. */
  http.post('/api/modern/newsletter', async ({ request }) => {
    const body = (await request.json()) as { email?: unknown };
    await delay(readDelay(new URL(request.url), 700));
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    if (!EMAIL_PATTERN.test(email)) {
      return HttpResponse.json({ message: 'Enter a valid e-mail address' }, { status: 422 });
    }
    if (email.toLowerCase().includes('taken')) {
      return HttpResponse.json({ message: `${email} is already subscribed` }, { status: 409 });
    }
    return HttpResponse.json({ email, message: `Subscribed ${email}` }, { status: 201 });
  }),

  /** Empty name → 422; a name containing "error" → 500. */
  http.put('/api/modern/display-name', async ({ request }) => {
    const body = (await request.json()) as { name?: unknown };
    await delay(readDelay(new URL(request.url), 800));
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) return HttpResponse.json({ message: 'Name is required' }, { status: 422 });
    if (name.toLowerCase().includes('error')) {
      return HttpResponse.json({ message: 'The server could not save that name' }, { status: 500 });
    }
    return HttpResponse.json({ name });
  }),

  /** Dashboard widgets for the Suspense demo. `?fail=1` returns 500. */
  http.get('/api/modern/widgets/:name', async ({ params, request }) => {
    const url = new URL(request.url);
    await delay(readDelay(url, 500));
    const widget = widgetData[String(params.name)];
    if (!widget) return HttpResponse.json({ message: 'Unknown widget' }, { status: 404 });
    if (url.searchParams.get('fail') === '1') {
      return HttpResponse.json({ message: `${widget.title} service is down` }, { status: 500 });
    }
    return HttpResponse.json(widget);
  }),
];
