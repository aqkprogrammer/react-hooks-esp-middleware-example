/**
 * Mock endpoints for the advanced real-world scenarios.
 *
 * Chunked uploads (scenario "File upload"):
 * - POST   /api/uploads/:id/chunks?index=N&total=M → stores chunk N of M (the
 *   request body) and responds `{ id, index, total, received, bytes }` after a
 *   small delay (default 150 ms, `?delay=ms` overrides it). 400 for an invalid
 *   index/total.
 *   When the `x-file-name` header contains "fail", chunk index 1 fails once
 *   per upload id with a 503 — so "Retry" can resume from that chunk.
 * - POST   /api/uploads/:id/complete → 200 `{ id, chunks, bytes }` when every
 *   chunk arrived, 409 `{ missing }` otherwise.
 * - DELETE /api/uploads/:id → discards the partial upload (204).
 *
 * Aborting the client request (fetch `signal`) ends the request early; the
 * handler notices `request.signal` and stores nothing for an aborted chunk.
 * State is in memory per page load (and per test file).
 */
import { delay, http, HttpResponse } from 'msw';

interface UploadSession {
  total: number;
  received: Set<number>;
  bytes: number;
  failedOnce: boolean;
}

const uploads = new Map<string, UploadSession>();

/** Forget every partial upload. Exposed for tests. */
export function resetScenarioUploads(): void {
  uploads.clear();
}

function latency(url: URL, fallback: number): number {
  const raw = url.searchParams.get('delay');
  const parsed = raw === null ? Number.NaN : Number(raw);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(10_000, parsed)) : fallback;
}

const isNonNegativeInteger = (value: number) => Number.isInteger(value) && value >= 0;

export const handlers = [
  http.post('/api/uploads/:id/chunks', async ({ params, request }) => {
    const url = new URL(request.url);
    const id = String(params.id);
    const index = Number(url.searchParams.get('index'));
    const total = Number(url.searchParams.get('total'));
    if (!isNonNegativeInteger(index) || !isNonNegativeInteger(total) || index >= total) {
      return HttpResponse.json({ message: 'Invalid chunk index/total' }, { status: 400 });
    }
    const body = await request.arrayBuffer();
    await delay(latency(url, 150));
    if (request.signal.aborted) {
      return HttpResponse.json({ message: 'Aborted' }, { status: 499 });
    }

    const session = uploads.get(id) ?? {
      total,
      received: new Set<number>(),
      bytes: 0,
      failedOnce: false,
    };
    uploads.set(id, session);

    const fileName = request.headers.get('x-file-name') ?? '';
    if (fileName.toLowerCase().includes('fail') && index === 1 && !session.failedOnce) {
      session.failedOnce = true;
      return HttpResponse.json(
        { message: `Chunk ${index + 1} of ${total} failed (simulated 503)` },
        { status: 503 },
      );
    }
    if (!session.received.has(index)) {
      session.received.add(index);
      session.bytes += body.byteLength;
    }
    return HttpResponse.json({
      id,
      index,
      total,
      received: session.received.size,
      bytes: session.bytes,
    });
  }),

  http.post('/api/uploads/:id/complete', async ({ params, request }) => {
    const id = String(params.id);
    await delay(latency(new URL(request.url), 80));
    const session = uploads.get(id);
    if (!session) return HttpResponse.json({ message: 'Unknown upload' }, { status: 404 });
    const missing: number[] = [];
    for (let index = 0; index < session.total; index += 1) {
      if (!session.received.has(index)) missing.push(index);
    }
    if (missing.length > 0) {
      return HttpResponse.json({ message: 'Upload incomplete', missing }, { status: 409 });
    }
    return HttpResponse.json({ id, chunks: session.total, bytes: session.bytes });
  }),

  http.delete('/api/uploads/:id', ({ params }) => {
    uploads.delete(String(params.id));
    return new HttpResponse(null, { status: 204 });
  }),
];
