/**
 * Remote feature-flag endpoint used by the useFeatureFlag demo.
 *
 * GET /api/feature-flags          → the "remote config" for the demo app
 * GET /api/feature-flags?fail=1   → 503, to show the fallback to defaults
 */
import { delay, http, HttpResponse, type RequestHandler } from 'msw';

export const remoteFeatureFlags = {
  newCheckout: true,
  searchMode: 'fuzzy',
  maxUploadMb: 25,
  // Unknown flags and wrongly-typed values are ignored by the client.
  legacyFlag: true,
} as const;

export const handlers: RequestHandler[] = [
  http.get('/api/feature-flags', async ({ request }) => {
    const url = new URL(request.url);
    await delay(Number(url.searchParams.get('delay') ?? '300') || 0);
    if (url.searchParams.get('fail') === '1') {
      return HttpResponse.json({ message: 'Flag service unavailable' }, { status: 503 });
    }
    return HttpResponse.json(remoteFeatureFlags);
  }),
];
