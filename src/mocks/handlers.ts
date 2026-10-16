/**
 * MSW request handlers for the playground's mocked API.
 *
 * - In the browser they run inside a Service Worker (see ./browser.ts), so
 *   demos use the real `fetch`, `WebSocket` and `EventSource` APIs.
 * - In tests they run in-process through `msw/node` (see src/test/server.ts).
 *
 * Every endpoint is synthetic and lives under `/api`. Latency is deliberately
 * non-uniform so race conditions and cancellation are observable.
 *
 * Feature folders can contribute extra handlers by adding a module to
 * `./extra/` that exports `handlers: RequestHandler[]` (or WebSocket handlers).
 */
import {
  delay,
  http,
  HttpResponse,
  sse,
  ws,
  type RequestHandler,
  type WebSocketHandler,
} from 'msw';
import {
  initialTodos,
  languages,
  paginate,
  products,
  users,
  type Product,
  type Todo,
} from './data';

export const LIVE_SOCKET_URL = 'wss://playground.invalid/live';

interface MockDb {
  todos: Todo[];
  flakyCalls: Map<string, number>;
  statsTick: number;
  nextTodoId: number;
}

const db: MockDb = {
  todos: [...initialTodos],
  flakyCalls: new Map(),
  statsTick: 0,
  nextTodoId: 100,
};

/** Restores the in-memory database. Called between tests. */
export function resetMockDb(): void {
  db.todos = initialTodos.map((todo) => ({ ...todo }));
  db.flakyCalls.clear();
  db.statsTick = 0;
  db.nextTodoId = 100;
}

function readDelay(url: URL, fallback: number): number {
  const raw = url.searchParams.get('delay');
  if (raw === null) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(10_000, parsed)) : fallback;
}

type SortKey = 'name' | 'price' | 'rating';
const sortKeys: readonly SortKey[] = ['name', 'price', 'rating'];

function sortProducts(list: Product[], sort: string | null, order: string | null): Product[] {
  if (!sort || !sortKeys.includes(sort as SortKey)) return list;
  const key = sort as SortKey;
  const direction = order === 'desc' ? -1 : 1;
  return [...list].sort((a, b) => {
    const left = a[key];
    const right = b[key];
    if (typeof left === 'string' && typeof right === 'string') {
      return left.localeCompare(right) * direction;
    }
    return ((left as number) - (right as number)) * direction;
  });
}

const liveSocket = ws.link(LIVE_SOCKET_URL);

/**
 * Server-Sent Events: emits a numbered tick five times, then closes.
 * MSW can only construct SSE handlers where `EventSource` exists (browsers),
 * so it is omitted in Node/jsdom test runs.
 */
const sseHandlers: RequestHandler[] =
  typeof EventSource === 'undefined'
    ? []
    : [
        sse('/api/events', ({ client }) => {
          let count = 0;
          const timer = setInterval(() => {
            count += 1;
            client.send({ id: String(count), data: JSON.stringify({ count, at: Date.now() }) });
            if (count >= 5) {
              clearInterval(timer);
              client.close();
            }
          }, 500);
        }),
      ];

const coreHandlers: Array<RequestHandler | WebSocketHandler> = [
  /**
   * Search with *intentionally inverted* latency: shorter queries are slower.
   * Typing "ja" then "jav" makes the first response arrive last, which is the
   * classic stale-response race.
   */
  http.get('/api/search', async ({ request }) => {
    const url = new URL(request.url);
    const query = (url.searchParams.get('q') ?? '').trim().toLowerCase();
    await delay(readDelay(url, Math.max(80, 600 - query.length * 120)));
    if (query === 'error') {
      return HttpResponse.json({ message: 'Search service unavailable' }, { status: 503 });
    }
    const results = query ? languages.filter((name) => name.toLowerCase().includes(query)) : [];
    return HttpResponse.json({ query, results });
  }),

  http.get('/api/products', async ({ request }) => {
    const url = new URL(request.url);
    const query = (url.searchParams.get('q') ?? '').trim().toLowerCase();
    const category = url.searchParams.get('category');
    const page = Number(url.searchParams.get('page') ?? '1') || 1;
    const pageSize = Number(url.searchParams.get('pageSize') ?? '10') || 10;
    await delay(readDelay(url, 200));
    let list = products.filter(
      (product) =>
        (!query || product.name.toLowerCase().includes(query)) &&
        (!category || product.category === category),
    );
    list = sortProducts(list, url.searchParams.get('sort'), url.searchParams.get('order'));
    return HttpResponse.json(paginate(list, page, pageSize));
  }),

  http.get('/api/products/:id', async ({ params, request }) => {
    await delay(readDelay(new URL(request.url), 150));
    const product = products.find((item) => item.id === Number(params.id));
    return product
      ? HttpResponse.json(product)
      : HttpResponse.json({ message: 'Product not found' }, { status: 404 });
  }),

  http.get('/api/users', async ({ request }) => {
    await delay(readDelay(new URL(request.url), 150));
    return HttpResponse.json(users);
  }),

  http.get('/api/users/:id', async ({ params, request }) => {
    await delay(readDelay(new URL(request.url), 150));
    const user = users.find((item) => item.id === Number(params.id));
    return user
      ? HttpResponse.json(user)
      : HttpResponse.json({ message: 'User not found' }, { status: 404 });
  }),

  http.get('/api/todos', async ({ request }) => {
    await delay(readDelay(new URL(request.url), 150));
    return HttpResponse.json(db.todos);
  }),

  /** A title containing "fail" returns 500 so optimistic UIs can demo rollback. */
  http.post('/api/todos', async ({ request }) => {
    const body = (await request.json()) as Partial<Todo>;
    await delay(readDelay(new URL(request.url), 400));
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) {
      return HttpResponse.json({ message: 'Title is required' }, { status: 422 });
    }
    if (title.toLowerCase().includes('fail')) {
      return HttpResponse.json({ message: `Server rejected "${title}"` }, { status: 500 });
    }
    const todo: Todo = { id: `t${db.nextTodoId++}`, title, completed: false };
    db.todos = [...db.todos, todo];
    return HttpResponse.json(todo, { status: 201 });
  }),

  http.patch('/api/todos/:id', async ({ params, request }) => {
    const patch = (await request.json()) as Partial<Todo>;
    await delay(readDelay(new URL(request.url), 300));
    const existing = db.todos.find((todo) => todo.id === params.id);
    if (!existing) return HttpResponse.json({ message: 'Todo not found' }, { status: 404 });
    if (request.headers.get('x-fail') === '1') {
      return HttpResponse.json({ message: 'Update failed' }, { status: 500 });
    }
    const updated: Todo = { ...existing, ...patch, id: existing.id };
    db.todos = db.todos.map((todo) => (todo.id === updated.id ? updated : todo));
    return HttpResponse.json(updated);
  }),

  http.delete('/api/todos/:id', async ({ params, request }) => {
    await delay(readDelay(new URL(request.url), 300));
    const before = db.todos.length;
    db.todos = db.todos.filter((todo) => todo.id !== params.id);
    return before === db.todos.length
      ? HttpResponse.json({ message: 'Todo not found' }, { status: 404 })
      : new HttpResponse(null, { status: 204 });
  }),

  /** Password "wrong" is rejected; anything else signs in. */
  http.post('/api/login', async ({ request }) => {
    const body = (await request.json()) as { username?: string; password?: string };
    await delay(readDelay(new URL(request.url), 400));
    if (!body.username || !body.password) {
      return HttpResponse.json({ message: 'Username and password are required' }, { status: 400 });
    }
    if (body.password === 'wrong') {
      return HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }
    return HttpResponse.json({
      token: `demo-token-${body.username}`,
      user: { id: 99, name: body.username, role: 'editor' },
    });
  }),

  http.get('/api/me', async ({ request }) => {
    await delay(readDelay(new URL(request.url), 150));
    const auth = request.headers.get('authorization') ?? '';
    const token = auth.replace(/^Bearer\s+/i, '');
    if (!token.startsWith('demo-token-')) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    return HttpResponse.json({ id: 99, name: token.slice('demo-token-'.length), role: 'editor' });
  }),

  /** Deterministic "live" metrics: each call advances one tick. */
  http.get('/api/stats', async ({ request }) => {
    await delay(readDelay(new URL(request.url), 120));
    db.statsTick += 1;
    const tick = db.statsTick;
    return HttpResponse.json({
      tick,
      activeUsers: 120 + ((tick * 37) % 60),
      requestsPerMinute: 900 + ((tick * 113) % 400),
      errorRate: Math.round(((tick * 7) % 50) / 10) / 10,
      updatedAt: new Date().toISOString(),
    });
  }),

  /** Fails the first `failures` calls for a given `key`, then succeeds. */
  http.get('/api/flaky', async ({ request }) => {
    const url = new URL(request.url);
    const key = url.searchParams.get('key') ?? 'default';
    const failures = Number(url.searchParams.get('failures') ?? '2');
    const calls = (db.flakyCalls.get(key) ?? 0) + 1;
    db.flakyCalls.set(key, calls);
    await delay(readDelay(url, 100));
    if (calls <= failures) {
      return HttpResponse.json(
        { message: `Attempt ${calls} failed`, attempt: calls },
        { status: 503 },
      );
    }
    return HttpResponse.json({ message: `Succeeded on attempt ${calls}`, attempt: calls });
  }),

  /** Responds after `ms` milliseconds (default 2s). Useful for timeouts/aborts. */
  http.get('/api/slow', async ({ request }) => {
    const url = new URL(request.url);
    const ms = Math.min(10_000, Number(url.searchParams.get('ms') ?? '2000') || 0);
    await delay(ms);
    return HttpResponse.json({ waitedMs: ms });
  }),

  /**
   * WebSocket: echoes `{type:"ping"}` as `{type:"pong"}`, and pushes a
   * notification for every `{type:"notify", text}` the client sends.
   */
  liveSocket.addEventListener('connection', ({ client }) => {
    client.send(JSON.stringify({ type: 'welcome', at: Date.now() }));
    client.addEventListener('message', (event) => {
      let message: unknown;
      try {
        message = JSON.parse(String(event.data));
      } catch {
        client.send(JSON.stringify({ type: 'error', message: 'Messages must be JSON' }));
        return;
      }
      if (typeof message !== 'object' || message === null) return;
      const typed = message as { type?: string; text?: string };
      if (typed.type === 'ping') {
        client.send(JSON.stringify({ type: 'pong', at: Date.now() }));
      } else if (typed.type === 'notify') {
        client.send(
          JSON.stringify({
            type: 'notification',
            id: `${Date.now()}-${Math.round(Math.random() * 1e6)}`,
            text: typed.text ?? 'Hello from the mock server',
            at: Date.now(),
          }),
        );
      }
    });
  }),
];

type HandlerModule = { handlers?: Array<RequestHandler | WebSocketHandler> };
const extraModules = import.meta.glob<HandlerModule>('./extra/*.ts', { eager: true });
const extraHandlers = Object.values(extraModules).flatMap((module) => module.handlers ?? []);

export const handlers: Array<RequestHandler | WebSocketHandler> = [
  ...extraHandlers,
  ...coreHandlers,
  ...sseHandlers,
];
