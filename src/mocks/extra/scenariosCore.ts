/**
 * Failure switches used by the core scenarios (src/examples/scenarios/*).
 *
 * Each handler only answers when its switch is present; otherwise the
 * resolver returns nothing and MSW falls through to the regular handler in
 * `../handlers.ts`, so the normal API contract is unchanged.
 */
import { delay, http, HttpResponse, type RequestHandler } from 'msw';

export const handlers: RequestHandler[] = [
  /** `GET /api/products?fail=1` → 500 (infinite-scroll error + retry). */
  http.get('/api/products', async ({ request }) => {
    const url = new URL(request.url);
    if (url.searchParams.get('fail') !== '1') return undefined;
    await delay(150);
    return HttpResponse.json({ message: 'Product service is unavailable' }, { status: 500 });
  }),

  /** `DELETE /api/todos/:id` with header `x-fail: 1` → 500 (optimistic delete rollback). */
  http.delete('/api/todos/:id', async ({ request }) => {
    if (request.headers.get('x-fail') !== '1') return undefined;
    await delay(300);
    return HttpResponse.json({ message: 'Delete failed' }, { status: 500 });
  }),
];
